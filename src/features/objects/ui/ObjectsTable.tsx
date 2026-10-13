import type { SortingState } from '@tanstack/react-table'
import type { ConstructionObject } from '@/entities/object'
import { DataTable, RotateLandscapeBanner } from '@/shared'
import type { ObjectsFiltersState } from '../model/objectsStore'
import { useObjectsColumns } from '../model/useColumns'

interface ObjectsTableProps {
  data: ConstructionObject[]
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  onOpenObject: (object: ConstructionObject) => void
  onEditObject: (object: ConstructionObject) => void
  onArchiveObject: (object: ConstructionObject) => void
  canEdit: boolean
  canArchive: boolean
  isLoading?: boolean
  filters: ObjectsFiltersState
  onFiltersChange: (filters: Partial<ObjectsFiltersState>) => void
  objectTypes: { id: string; name: string }[]
  counterparties: { id: string; name: string }[]
}

/**
 * Таблица объектов: колонки собираются в хуке useObjectsColumns (columnHelper),
 * рендер — переиспользуемый DataTable из shared.
 * На узком portrait — баннер «поверните устройство».
 */
export function ObjectsTable({
  data,
  sorting,
  onSortingChange,
  onOpenObject,
  onEditObject,
  onArchiveObject,
  canEdit,
  canArchive,
  isLoading,
  filters,
  onFiltersChange,
  objectTypes,
  counterparties,
}: ObjectsTableProps) {
  const columns = useObjectsColumns({
    onOpenObject,
    onEditObject,
    onArchiveObject,
    canEdit,
    canArchive,
    filters,
    onFiltersChange,
    objectTypes,
    counterparties,
  })

  return (
    <div className="min-w-0">
      <div className="px-4 pt-3">
        <RotateLandscapeBanner />
      </div>
      <DataTable
        data={data}
        columns={columns}
        sorting={sorting}
        onSortingChange={onSortingChange}
        manualSorting
        headerOwnsInteractionColumnIds={[
          'objectTypeId',
          'customerOrganizationId',
          'contractorOrganizationId',
          'status',
        ]}
        getRowId={(row) => row.id}
        onRowClick={onOpenObject}
        isLoading={isLoading}
        emptyText="Объектов не найдено"
      />
    </div>
  )
}
