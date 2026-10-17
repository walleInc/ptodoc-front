import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Archive, Pencil } from 'lucide-react'
import type { ConstructionObject } from '@/entities/object'
import { StatusBadge } from '@/entities/object'
import {
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared'
import type { ObjectsFiltersState } from './objectsStore'
import { ColumnFilterPopup } from '../ui/ColumnFilterPopup'

const columnHelper = createColumnHelper<ConstructionObject>()

export interface ObjectsColumnActions {
  onOpenObject: (object: ConstructionObject) => void
  onEditObject: (object: ConstructionObject) => void
  onArchiveObject: (object: ConstructionObject) => void
  /** Изменить / архивировать — только owner (как на бэке) */
  canEdit: boolean
  canArchive: boolean
  filters: ObjectsFiltersState
  onFiltersChange: (filters: Partial<ObjectsFiltersState>) => void
  objectTypes: { id: string; name: string }[]
  counterparties: { id: string; name: string }[]
}

const OBJECT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Черновик' },
  { value: 'active', label: 'Активен' },
  { value: 'on_hold', label: 'На паузе' },
  { value: 'completed', label: 'Завершён' },
  { value: 'archived', label: 'В архиве' },
]

/**
 * Колонки таблицы объектов (stage-1): название, код, тип, адрес, заказчик, подрядчик, статус, действия.
 * Сортировка — enableSorting, фильтры — ColumnFilterPopup в заголовках.
 */
export function useObjectsColumns({
  onOpenObject: _onOpenObject,
  onEditObject,
  onArchiveObject,
  canEdit,
  canArchive,
  filters,
  onFiltersChange,
  objectTypes,
  counterparties,
}: ObjectsColumnActions): ColumnDef<ConstructionObject, any>[] {
  void _onOpenObject
  const counterpartyOptions = counterparties.map((o) => ({ value: o.id, label: o.name }))

  return [
    columnHelper.accessor('name', {
      id: 'name',
      header: 'Название',
      enableSorting: true,
      cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.name}</span>,
    }),
    columnHelper.accessor('code', {
      id: 'code',
      header: 'Код',
      enableSorting: true,
      cell: ({ row }) => <span className="font-mono text-xs text-gray-600">{row.original.code}</span>,
    }),
    columnHelper.accessor((row) => row.objectType?.name ?? '', {
      id: 'objectTypeId',
      header: () => (
        <ColumnFilterPopup
          label="Тип"
          active={!!filters.objectTypeId}
          options={objectTypes.map((t) => ({ value: t.id, label: t.name }))}
          value={filters.objectTypeId ? [filters.objectTypeId] : []}
          onApply={(values) => onFiltersChange({ objectTypeId: values[0] || undefined })}
        />
      ),
      cell: ({ row }) => <Badge variant="outline">{row.original.objectType?.name || '—'}</Badge>,
      enableSorting: true,
    }),
    columnHelper.accessor((row) => row.address ?? '', {
      id: 'address',
      header: 'Адрес',
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-gray-500 block max-w-[200px] truncate">{row.original.address || '—'}</span>
      ),
    }),
    columnHelper.accessor((row) => row.customer?.name ?? '', {
      id: 'customerOrganizationId',
      header: () => (
        <ColumnFilterPopup
          label="Заказчик"
          active={!!filters.customerOrganizationId}
          options={counterpartyOptions}
          value={filters.customerOrganizationId ? [filters.customerOrganizationId] : []}
          onApply={(values) => onFiltersChange({ customerOrganizationId: values[0] || undefined })}
        />
      ),
      cell: ({ row }) => (
        <span className="text-gray-500">{row.original.customer?.name || '—'}</span>
      ),
      enableSorting: true,
    }),
    columnHelper.accessor((row) => row.contractor?.name ?? '', {
      id: 'contractorOrganizationId',
      header: () => (
        <ColumnFilterPopup
          label="Подрядчик"
          active={!!filters.contractorOrganizationId}
          options={counterpartyOptions}
          value={filters.contractorOrganizationId ? [filters.contractorOrganizationId] : []}
          onApply={(values) => onFiltersChange({ contractorOrganizationId: values[0] || undefined })}
        />
      ),
      cell: ({ row }) => (
        <span className="text-gray-500">{row.original.contractor?.name || '—'}</span>
      ),
      enableSorting: true,
    }),
    columnHelper.accessor('status', {
      id: 'status',
      header: () => (
        <ColumnFilterPopup
          label="Статус"
          active={filters.status.length > 0}
          options={
            filters.includeArchived
              ? OBJECT_STATUS_OPTIONS
              : OBJECT_STATUS_OPTIONS.filter((o) => o.value !== 'archived')
          }
          value={filters.status}
          multi
          onApply={(values) => onFiltersChange({ status: values as ObjectsFiltersState['status'] })}
        />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      enableSorting: true,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Действия',
      cell: ({ row }) => {
        const isArchived = row.original.status === 'archived'
        return (
          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            {canEdit && !isArchived && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Изменить"
                    onClick={() => onEditObject(row.original)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Изменить</TooltipContent>
              </Tooltip>
            )}
            {canArchive && !isArchived && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    aria-label="Архивировать"
                    onClick={() => onArchiveObject(row.original)}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Архивировать</TooltipContent>
              </Tooltip>
            )}
          </div>
        )
      },
    }),
  ]
}
