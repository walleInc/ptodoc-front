import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useObjects } from '@/features/objects'
import { useUser, useIsOwner, ROLE_LABELS } from '@/features/auth'
import { Button } from '@/shared'
import { DashboardStats } from './DashboardStats'
import { DashboardRecentObjects } from './DashboardRecentObjects'

export function DashboardPage() {
  const user = useUser()
  const isOwner = useIsOwner()
  const { data, isLoading } = useObjects({ page: 1, limit: 100, sortBy: 'updatedAt', sortOrder: 'desc' })
  const objects = data?.data ?? []
  const role = user?.role
  const roleLabel = role ? ROLE_LABELS[role] ?? role : '—'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Обзор</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base truncate">
            {user?.email} · {roleLabel}
          </p>
        </div>
        {isOwner && (
          <Button asChild className="w-full sm:w-auto shrink-0">
            <Link to="/objects/new">
              <Plus className="h-4 w-4 mr-2" />
              Создать объект
            </Link>
          </Button>
        )}
      </div>

      <DashboardStats objects={objects} total={data?.total ?? 0} isLoading={isLoading} />

      <DashboardRecentObjects
        objects={objects.slice(0, 5)}
        isLoading={isLoading}
        canCreate={isOwner}
      />
    </div>
  )
}
