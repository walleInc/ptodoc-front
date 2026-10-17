import { Link } from 'react-router-dom'
import { ChevronRight, FileStack, Loader2 } from 'lucide-react'
import { PackageStatusBadge } from '@/entities/package'
import { usePackages } from '@/features/upload'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared'
import { formatObjectDate } from '../model/formatObjectDate'

interface ObjectPackagesCardProps {
  objectId: string
}

/** Список пакетов документов объекта (GET /objects/:id/packages). */
export function ObjectPackagesCard({ objectId }: ObjectPackagesCardProps) {
  const { data: packages, isLoading, error } = usePackages(objectId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileStack className="h-5 w-5 text-gray-500" />
          Пакеты документов
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        )}

        {!isLoading && error && (
          <p className="text-sm text-red-600">Не удалось загрузить список пакетов.</p>
        )}

        {!isLoading && !error && packages?.length === 0 && (
          <p className="text-sm text-gray-500">Пока нет загрузок. Загрузите документы, чтобы начать проверку.</p>
        )}

        {!isLoading && !error && packages && packages.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {packages.map((pkg) => (
              <li key={pkg.id}>
                <Link
                  to={`/objects/${objectId}/packages/${pkg.id}`}
                  className="flex items-center gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">Версия {pkg.version}</span>
                      <PackageStatusBadge status={pkg.status} />
                    </div>
                    <p className="text-xs text-gray-500">{formatObjectDate(pkg.createdAt)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
