import { CheckCircle2, CircleDashed, CircleDot, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, Progress, cn } from '@/shared'
import type { ChecklistStatus } from '@/entities/package'
import { useChecklist } from '../api/checklistApi'

const STATUS_VIEW: Record<ChecklistStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  complete: { label: 'Комплект', icon: CheckCircle2, className: 'text-green-600' },
  partial: { label: 'Неполный', icon: CircleDot, className: 'text-amber-600' },
  missing: { label: 'Отсутствует', icon: CircleDashed, className: 'text-red-600' },
}

interface ChecklistPanelProps {
  objectId: string
  packageId: string
  /** Хотя бы один документ обработан — до этого комплектность считать рано */
  ready: boolean
  /** Пакет ещё обрабатывается: значения предварительные */
  provisional?: boolean
  onSelectDocument: (documentId: string) => void
}

export function ChecklistPanel({ objectId, packageId, ready, provisional, onSelectDocument }: ChecklistPanelProps) {
  const { data, isLoading, error } = useChecklist(objectId, packageId, ready)

  if (!ready) {
    return <p className="p-6 text-center text-sm text-gray-500">Комплектность считается, как только будет обработан первый документ</p>
  }
  if (isLoading) return <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-primary-600" />
  if (error || !data) {
    const status = (error as { response?: { status?: number } } | null)?.response?.status
    return (
      <div className="p-3">
        <Alert variant="destructive">
          <AlertDescription>
            {status === 501
              ? 'Комплектность пока недоступна: эндпоинт на бэкенде ещё не реализован.'
              : 'Не удалось загрузить комплектность.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const readiness = Math.round(data.readiness * 100)
  return (
    <div className="space-y-3 overflow-y-auto p-3">
      {provisional && (
        <p className="rounded bg-blue-50 px-2 py-1.5 text-xs text-blue-700">
          Проверка идёт — данные предварительные, обновятся по мере обработки документов.
        </p>
      )}
      <div>
        <div className="mb-1 flex items-baseline justify-between text-sm">
          <span className="font-medium text-gray-900">Готовность комплекта</span>
          <span className="tabular-nums text-gray-600">{readiness}%</span>
        </div>
        <Progress value={readiness} aria-label="Готовность комплекта" />
      </div>

      <ul className="space-y-2">
        {data.items.map((item) => {
          const view = STATUS_VIEW[item.status]
          const Icon = view.icon
          const first = item.documentIds[0]
          return (
            <li key={item.documentType} className="rounded-md border border-gray-200 bg-white">
              <button
                type="button"
                disabled={!first}
                onClick={() => first && onSelectDocument(first)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left enabled:hover:bg-gray-50 disabled:cursor-default"
              >
                <Icon className={cn('h-5 w-5 shrink-0', view.className)} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-gray-900">{item.title}</span>
                  <span className={cn('text-xs', view.className)}>{view.label}</span>
                </span>
                <span className="text-sm tabular-nums text-gray-600">
                  {item.found}/{item.required}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
