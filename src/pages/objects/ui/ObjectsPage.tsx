import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { SortingState } from '@tanstack/react-table'
import type { ConstructionObject, ObjectSortBy } from '@/entities/object'
import {
  useObjects,
  useObjectTypes,
  useCounterparties,
  useArchiveObject,
  useObjectsStore,
  ObjectsTable,
  ObjectsFilters,
  ObjectsPagination,
} from '@/features/objects'
import { useIsOwner } from '@/features/auth'
import { Alert, AlertDescription, Button, Card, CardContent, ConfirmDialog, Label } from '@/shared'
import { ObjectsPageHeader } from './ObjectsPageHeader'
import { OBJECTS_PAGE_LIMIT } from '../model/constants'

export function ObjectsPage() {
  const navigate = useNavigate()
  const isOwner = useIsOwner()
  const { filters, setFilters, resetFilters } = useObjectsStore()
  const { data: objectsData, isLoading, isError, refetch } = useObjects({ ...filters, limit: OBJECTS_PAGE_LIMIT })
  const { data: objectTypes } = useObjectTypes()
  const { data: counterparties } = useCounterparties()
  const archiveMutation = useArchiveObject()

  const [objectToArchive, setObjectToArchive] = useState<ConstructionObject | null>(null)

  // tanstack sorting state -> серверные sortBy/sortOrder
  const sorting: SortingState = filters.sortBy
    ? [{ id: filters.sortBy, desc: filters.sortOrder === 'desc' }]
    : []

  const handleSortingChange = (next: SortingState) => {
    const first = next[0]
    if (!first) {
      setFilters({ sortBy: 'updatedAt', sortOrder: 'desc' })
      return
    }
    setFilters({
      sortBy: first.id as ObjectSortBy,
      sortOrder: first.desc ? 'desc' : 'asc',
    })
  }

  const handleArchive = async (id: string) => {
    try {
      await archiveMutation.mutateAsync(id)
      setObjectToArchive(null)
    } catch {
      // ошибка показывается в диалоге через archiveMutation.isError
    }
  }

  const isEmpty = !isLoading && !isError && objectsData?.total === 0
  const hasFilters =
    filters.search !== '' ||
    filters.status.length > 0 ||
    !!filters.objectTypeId ||
    !!filters.customerOrganizationId ||
    !!filters.contractorOrganizationId

  return (
    <div className="space-y-6">
      <ObjectsPageHeader canCreate={isOwner} onCreate={() => navigate('/objects/new')} />

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 px-4 py-3 border-b border-gray-200 sm:flex-row sm:items-center">
            <div className="flex-1 min-w-0">
              <ObjectsFilters filters={filters} onChange={setFilters} onReset={resetFilters} />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                id="includeArchived"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 accent-primary-600 cursor-pointer"
                checked={!!filters.includeArchived}
                onChange={(e) =>
                  setFilters({
                    includeArchived: e.target.checked,
                    status: e.target.checked ? filters.status : filters.status.filter((s) => s !== 'archived'),
                  })
                }
              />
              <Label htmlFor="includeArchived" className="cursor-pointer text-sm font-normal">
                Показать архив
              </Label>
            </div>
          </div>

          {isError ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>Не удалось загрузить объекты.</span>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Повторить
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          ) : isEmpty && !hasFilters ? (
            <div className="py-12 text-center text-gray-500">
              <p>Объектов пока нет</p>
              {isOwner && (
                <Link to="/objects/new" className="text-primary-600 hover:underline mt-2 inline-block">
                  Создать первый объект
                </Link>
              )}
            </div>
          ) : (
            <ObjectsTable
              data={objectsData?.data ?? []}
              sorting={sorting}
              onSortingChange={handleSortingChange}
              onOpenObject={(object) => navigate(`/objects/${object.id}`)}
              onEditObject={(object) => navigate(`/objects/${object.id}/edit`)}
              onArchiveObject={setObjectToArchive}
              canEdit={isOwner}
              canArchive={isOwner}
              isLoading={isLoading}
              filters={filters}
              onFiltersChange={setFilters}
              objectTypes={objectTypes || []}
              counterparties={counterparties || []}
            />
          )}

          {objectsData && !isError && objectsData.total > 0 && (
            <ObjectsPagination
              page={objectsData.page}
              totalPages={objectsData.totalPages}
              total={objectsData.total}
              onChange={(page) => setFilters({ page })}
            />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={!!objectToArchive}
        onClose={() => setObjectToArchive(null)}
        onConfirm={() => objectToArchive && handleArchive(objectToArchive.id)}
        title="Архивировать объект?"
        description="Объект станет доступен только для просмотра. Это действие нельзя отменить."
        confirmText="Архивировать"
        variant="destructive"
        isLoading={archiveMutation.isPending}
      />
    </div>
  )
}
