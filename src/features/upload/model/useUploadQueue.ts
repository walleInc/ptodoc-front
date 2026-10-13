import { useCallback, useRef, useState } from 'react'
import type { AxiosError } from 'axios'
import {
  ALLOWED_MIME_TYPES,
  MAX_PACKAGE_FILES,
  type AllowedMimeType,
  type UploadTarget,
} from '@/entities/package'
import { packagesApi, uploadToStorage } from '../api/packagesApi'
import { sha256Hex } from './sha256'

export type UploadItemStatus = 'queued' | 'uploading' | 'uploaded' | 'duplicate' | 'error'

export interface UploadItem {
  id: string
  file: File
  status: UploadItemStatus
  progress: number
  error?: string
}

export type UploadPhase = 'idle' | 'preparing' | 'uploading' | 'starting'

const CONCURRENCY = 3

let seq = 0
const nextId = () => `f${++seq}`

function isAllowed(file: File): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)
}

function errorMessage(err: unknown): string {
  const e = err as AxiosError<{ message?: string }>
  return e.response?.data?.message ?? 'Не удалось выполнить запрос'
}

async function runPool<T>(tasks: T[], worker: (task: T) => Promise<void>) {
  const queue = [...tasks]
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      for (let task = queue.shift(); task !== undefined; task = queue.shift()) await worker(task)
    })
  )
}

/**
 * Очередь загрузки пакета: выбор файлов → sha256 → POST packages → PUT в хранилище → start.
 * После частичной ошибки `submit` повторно загружает только упавшие файлы в том же пакете.
 */
export function useUploadQueue(objectId: string) {
  const [items, setItems] = useState<UploadItem[]>([])
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [rejected, setRejected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const itemsRef = useRef<UploadItem[]>([])
  const packageIdRef = useRef<string | null>(null)
  const targetsRef = useRef(new Map<string, UploadTarget>())

  const update = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
      itemsRef.current = next
      return next
    })
  }, [])

  const setAll = (next: UploadItem[]) => {
    itemsRef.current = next
    setItems(next)
  }

  const addFiles = useCallback((files: File[]) => {
    if (packageIdRef.current) return // пакет уже создан — набор фиксирован
    const bad: string[] = []
    const room = MAX_PACKAGE_FILES - itemsRef.current.length
    const accepted: UploadItem[] = []
    for (const file of files) {
      if (!isAllowed(file)) bad.push(`${file.name}: формат не поддерживается`)
      else if (file.size === 0) bad.push(`${file.name}: пустой файл`)
      else if (accepted.length >= room) bad.push(`${file.name}: максимум ${MAX_PACKAGE_FILES} файлов в пакете`)
      else accepted.push({ id: nextId(), file, status: 'queued', progress: 0 })
    }
    setRejected(bad)
    setAll([...itemsRef.current, ...accepted])
  }, [])

  const removeItem = useCallback((id: string) => {
    if (packageIdRef.current) return
    setAll(itemsRef.current.filter((i) => i.id !== id))
  }, [])

  const uploadItems = async (list: UploadItem[]) => {
    await runPool(list, async (item) => {
      const target = targetsRef.current.get(item.id)
      if (!target) return
      if (!target.uploadUrl) {
        update(item.id, { status: 'duplicate', progress: 100, error: undefined })
        return
      }
      update(item.id, { status: 'uploading', progress: 0, error: undefined })
      try {
        await uploadToStorage(target, item.file, (progress) => update(item.id, { progress }))
        update(item.id, { status: 'uploaded', progress: 100 })
      } catch {
        update(item.id, { status: 'error', error: 'Не удалось загрузить файл' })
      }
    })
  }

  /** Возвращает id пакета, если всё загружено и обработка запущена. */
  const submit = useCallback(async (): Promise<string | null> => {
    setError(null)
    try {
      let packageId = packageIdRef.current
      let toUpload: UploadItem[]

      if (!packageId) {
        setPhase('preparing')
        const snapshot = itemsRef.current
        const files = await Promise.all(
          snapshot.map(async ({ file }) => ({
            fileName: file.name,
            mimeType: file.type as AllowedMimeType,
            sizeBytes: file.size,
            sha256: (await sha256Hex(file)) ?? undefined,
          }))
        )
        const created = await packagesApi.create(objectId, { files })
        packageId = created.package.id
        packageIdRef.current = packageId
        // Порядок uploads совпадает с порядком files в запросе
        created.uploads.forEach((target, i) => {
          const item = snapshot[i]
          if (item) targetsRef.current.set(item.id, target)
        })
        toUpload = snapshot
      } else {
        toUpload = itemsRef.current.filter((i) => i.status === 'error')
      }

      setPhase('uploading')
      await uploadItems(toUpload)

      if (itemsRef.current.some((i) => i.status === 'error')) {
        setError('Часть файлов не загрузилась. Повторите попытку.')
        setPhase('idle')
        return null
      }

      setPhase('starting')
      await packagesApi.start(packageId)
      return packageId
    } catch (err) {
      setError(errorMessage(err))
      setPhase('idle')
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId, update])

  return {
    items,
    phase,
    error,
    rejected,
    hasPackage: !!packageIdRef.current,
    addFiles,
    removeItem,
    submit,
  }
}
