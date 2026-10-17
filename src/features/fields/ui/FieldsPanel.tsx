import { useState } from 'react'
import { AlertTriangle, Check, Loader2, Pencil, X } from 'lucide-react'
import { Alert, AlertDescription, Badge, Button, Input, cn } from '@/shared'
import { DEFAULT_LOW_CONFIDENCE_THRESHOLD, type ExtractedField } from '@/entities/package'
import { useDocumentDetail, useUpdateFields } from '../api/fieldsApi'

interface FieldsPanelProps {
  documentId?: string
  /** Документ обработан — до этого полей ещё нет */
  ready: boolean
  selectedKey?: string
  onSelectField: (field: ExtractedField) => void
}

export function FieldsPanel({ documentId, ready, selectedKey, onSelectField }: FieldsPanelProps) {
  const { data: document, isLoading, error } = useDocumentDetail(documentId, ready)

  if (!documentId) return <Empty>Выберите документ в дереве слева</Empty>
  if (!ready) return <Empty>Поля появятся после обработки документа</Empty>
  if (isLoading) return <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-primary-600" />
  if (error || !document) {
    const status = (error as { response?: { status?: number } } | null)?.response?.status
    return (
      <div className="p-3">
        <Alert variant="destructive">
          <AlertDescription>
            {status === 501
              ? 'Поля пока недоступны: эндпоинт на бэкенде ещё не реализован.'
              : 'Не удалось загрузить поля документа.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  if (document.fields.length === 0) return <Empty>Поля не извлечены</Empty>

  const threshold = document.lowConfidenceThreshold ?? DEFAULT_LOW_CONFIDENCE_THRESHOLD
  return (
    <ul className="space-y-2 overflow-y-auto p-3" aria-label="Извлечённые поля">
      {document.fields.map((field) => (
        <FieldRow
          key={`${document.id}:${field.key}`}
          documentId={document.id}
          field={field}
          lowConfidence={field.confidence < threshold}
          selected={field.key === selectedKey}
          onSelect={() => onSelectField(field)}
        />
      ))}
    </ul>
  )
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="p-6 text-center text-sm text-gray-500">{children}</p>
)

interface FieldRowProps {
  documentId: string
  field: ExtractedField
  lowConfidence: boolean
  selected: boolean
  onSelect: () => void
}

function FieldRow({ documentId, field, lowConfidence, selected, onSelect }: FieldRowProps) {
  const update = useUpdateFields(documentId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const startEdit = () => {
    setDraft(field.value ?? '')
    setError(null)
    setEditing(true)
  }

  const save = async () => {
    const value = draft.trim() === '' ? null : draft.trim()
    if (value === field.value) return setEditing(false)
    try {
      await update.mutateAsync([{ key: field.key, value }])
      setEditing(false)
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(message ?? 'Не удалось сохранить значение.')
    }
  }

  return (
    <li
      className={cn(
        'rounded-md border bg-white px-3 py-2',
        lowConfidence ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200',
        selected && 'ring-1 ring-primary-300'
      )}
    >
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <button type="button" onClick={onSelect} className="font-medium hover:text-gray-900 hover:underline">
          {field.label}
        </button>
        {lowConfidence && (
          <span className="inline-flex items-center gap-1 text-amber-700" title="Проверьте значение вручную">
            <AlertTriangle className="h-3 w-3" />
            {Math.round(field.confidence * 100)}%
          </span>
        )}
        {field.editedManually && <Badge variant="info">Изменено</Badge>}
      </div>

      {editing ? (
        <div className="mt-1.5 flex items-center gap-1.5">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save()
              if (e.key === 'Escape') setEditing(false)
            }}
            aria-label={field.label}
            autoFocus
          />
          <Button size="icon" className="h-9 w-9 shrink-0" aria-label="Сохранить" onClick={save} loading={update.isPending}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" aria-label="Отмена" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="mt-0.5 flex items-start gap-2">
          <p className={cn('min-w-0 flex-1 break-words text-sm', field.value ? 'text-gray-900' : 'text-gray-400')}>
            {field.value ?? 'не найдено'}
          </p>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={`Изменить: ${field.label}`} onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {field.editedManually && field.originalValue !== undefined && (
        <p className="mt-1 text-xs text-gray-500">Было: {field.originalValue ?? 'не найдено'}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  )
}
