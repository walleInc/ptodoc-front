import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { api } from '@/shared'
import {
  FINISHED_PACKAGE_STATUSES,
  LAST_STAGE,
  PACKAGE_EVENT_TYPES,
  type Package,
  type PackageDetail,
  type PackageEvent,
} from '@/entities/package'
import { applyDocumentStage, applyProgressEvent } from '../model/applyPackageEvent'
import { packagesApi } from './packagesApi'

const ACTIVE_STATUSES = ['uploading', 'queued', 'processing']
const POLL_MS = 1500
const POLL_WHEN_LIVE_MS = 10_000 // страховка, пока SSE подключён

const packagesListKey = (objectId: string) => ['objects', objectId, 'packages'] as const
const packageKey = (packageId: string) => ['packages', packageId] as const

/** Список пакетов объекта (новые сверху). */
export function usePackages(objectId: string) {
  return useQuery<Package[], AxiosError>({
    queryKey: packagesListKey(objectId),
    queryFn: () => packagesApi.list(objectId),
    enabled: !!objectId,
  })
}

/**
 * Состояние пакета: прогресс приходит по SSE, а пока поток не подключён
 * (или оборвался) — запасной поллинг GET /packages/{id}.
 */
export function usePackage(packageId: string) {
  const queryClient = useQueryClient()
  const [live, setLive] = useState(false)

  const query = useQuery<PackageDetail, AxiosError>({
    queryKey: packageKey(packageId),
    queryFn: () => packagesApi.getById(packageId),
    enabled: !!packageId,
    refetchInterval: (q) =>
      q.state.data && ACTIVE_STATUSES.includes(q.state.data.status) ? (live ? POLL_WHEN_LIVE_MS : POLL_MS) : false,
  })

  const active = !!query.data && ACTIVE_STATUSES.includes(query.data.status)

  useEffect(() => {
    if (!packageId || !active || typeof EventSource === 'undefined') return

    const source = new EventSource(`${api.defaults.baseURL ?? '/api'}/packages/${packageId}/events`, {
      withCredentials: true,
    })
    source.onopen = () => setLive(true)
    source.onerror = () => setLive(false) // браузер переподключится сам, пока работает поллинг

    const refetchPackage = () => queryClient.invalidateQueries({ queryKey: packageKey(packageId) })

    const handle = (message: MessageEvent<string>) => {
      let event: PackageEvent
      try {
        event = JSON.parse(message.data) as PackageEvent
      } catch {
        return
      }

      if (event.type === 'document.stage') {
        queryClient.setQueryData<PackageDetail>(packageKey(packageId), (prev) => applyDocumentStage(prev, event))
        // документ закончил обработку (или упал): его статус и счётчики берём из GET пакета
        if (event.status === 'failed' || (event.stage === LAST_STAGE && event.status === 'succeeded')) {
          void refetchPackage()
        }
        return
      }

      queryClient.setQueryData<PackageDetail>(packageKey(packageId), (prev) => applyProgressEvent(prev, event))
      if (FINISHED_PACKAGE_STATUSES.includes(event.status)) {
        source.close()
        setLive(false)
        void refetchPackage()
      }
    }
    PACKAGE_EVENT_TYPES.forEach((type) => source.addEventListener(type, handle as EventListener))

    return () => {
      source.close()
      setLive(false)
    }
  }, [packageId, active, queryClient])

  return query
}
