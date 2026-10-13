import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore, useIsOwner } from '@/features/auth'

interface OwnerRouteProps {
  children: React.ReactNode
}

/** Owner-only страницы (create/edit объекта) — как RolesGuard на бэке. */
export function OwnerRoute({ children }: OwnerRouteProps) {
  const sessionChecked = useAuthStore((s) => s.sessionChecked)
  const user = useAuthStore((s) => s.user)
  const isOwner = useIsOwner()

  if (!sessionChecked) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!user || user.role !== 'owner' || !isOwner) {
    return <Navigate to="/objects" replace />
  }

  return <>{children}</>
}
