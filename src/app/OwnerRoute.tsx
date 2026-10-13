import { Navigate } from 'react-router-dom'
import { useIsOwner } from '@/features/auth'

interface OwnerRouteProps {
  children: React.ReactNode
}

/** Owner-only страницы (create/edit объекта) — как RolesGuard на бэке. */
export function OwnerRoute({ children }: OwnerRouteProps) {
  const isOwner = useIsOwner()
  if (!isOwner) return <Navigate to="/objects" replace />
  return <>{children}</>
}
