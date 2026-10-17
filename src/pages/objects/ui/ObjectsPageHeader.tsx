import { Plus } from 'lucide-react'
import { Button } from '@/shared'

export function ObjectsPageHeader({
  onCreate,
  canCreate = false,
}: {
  onCreate: () => void
  canCreate?: boolean
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Строительные объекты</h1>
        <p className="text-gray-500 mt-1 text-sm sm:text-base">Управление объектами и пакетами проверки</p>
      </div>
      {canCreate && (
        <Button onClick={onCreate} className="w-full shrink-0 sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Создать объект
        </Button>
      )}
    </div>
  )
}
