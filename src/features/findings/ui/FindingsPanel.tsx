import { useMemo, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Alert, AlertDescription, cn } from '@/shared'
import {
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  type Finding,
  type FindingStatus,
  type Severity,
} from '@/entities/finding'
import type { PackageDocument } from '@/entities/package'
import { useFindings, useUpdateFinding } from '../api/findingsApi'
import { countBySeverity, filterFindings } from '../model/filterFindings'
import { SEVERITY_STYLES } from '../model/severityStyles'
import { DismissDialog } from './DismissDialog'
import { FindingCard } from './FindingCard'

type Scope = 'document' | 'package'
type StatusView = 'open' | 'all'

interface FindingsPanelProps {
  objectId: string
  packageId: string
  documents: PackageDocument[]
  /** Хотя бы один документ обработан — до этого замечаний ещё нет */
  ready: boolean
  /** Пакет ещё обрабатывается: появятся замечания других документов */
  processing?: boolean
  selectedDocumentId?: string
  selectedFindingId?: string
  onSelectFinding: (finding: Finding) => void
}

export function FindingsPanel({
  objectId,
  packageId,
  documents,
  ready,
  processing,
  selectedDocumentId,
  selectedFindingId,
  onSelectFinding,
}: FindingsPanelProps) {
  const { data, isLoading, error } = useFindings(objectId, packageId, ready)
  const update = useUpdateFinding()

  const [scope, setScope] = useState<Scope>('document')
  const [statusView, setStatusView] = useState<StatusView>('open')
  const [severities, setSeverities] = useState<Severity[]>([])
  const [dismissing, setDismissing] = useState<Finding | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const documentNames = useMemo(() => new Map(documents.map((d) => [d.id, d.fileName])), [documents])
  const items = data?.items ?? []
  const effectiveScope: Scope = selectedDocumentId ? scope : 'package'
  const base = {
    documentId: effectiveScope === 'document' ? selectedDocumentId : undefined,
    statuses: (statusView === 'open' ? ['open'] : []) as FindingStatus[],
  }
  const visible = filterFindings(items, { ...base, severities })
  const counts = countBySeverity(items, base)

  const decide = async (finding: Finding, status: FindingStatus, comment?: string) => {
    setActionError(null)
    try {
      await update.mutateAsync({ id: finding.id, body: { status, ...(comment ? { comment } : {}) } })
      setDismissing(null)
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setActionError(message ?? 'Не удалось сохранить решение.')
    }
  }

  const toggleSeverity = (s: Severity) =>
    setSeverities((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  return (
    <section aria-label="Замечания" className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-gray-200 p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Замечания</h2>
          <div className="inline-flex rounded-md border border-gray-200 text-xs" role="group" aria-label="Статус">
            {(['open', 'all'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={statusView === v}
                onClick={() => setStatusView(v)}
                className={cn('px-2 py-1 first:rounded-l-md last:rounded-r-md', statusView === v ? 'bg-gray-900 text-white' : 'hover:bg-gray-100')}
              >
                {v === 'open' ? 'Открытые' : 'Все'}
              </button>
            ))}
          </div>
        </div>

        {selectedDocumentId && (
          <div className="inline-flex rounded-md border border-gray-200 text-xs" role="group" aria-label="Область">
            {(['document', 'package'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={scope === v}
                onClick={() => setScope(v)}
                className={cn('px-2 py-1 first:rounded-l-md last:rounded-r-md', scope === v ? 'bg-gray-900 text-white' : 'hover:bg-gray-100')}
              >
                {v === 'document' ? 'Этот документ' : 'Весь пакет'}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {SEVERITY_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={severities.includes(s)}
              onClick={() => toggleSeverity(s)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs',
                severities.includes(s) ? SEVERITY_STYLES[s].chip : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', SEVERITY_STYLES[s].dot)} />
              {SEVERITY_LABELS[s]}
              <span className="tabular-nums">{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {actionError && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}
        {!ready && (
          <p className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Идёт обработка — замечания появятся, как только будет готов первый документ.
          </p>
        )}
        {ready && processing && (
          <p className="mb-3 flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Обработка продолжается — замечания других документов появятся по мере готовности.
          </p>
        )}
        {ready && isLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary-600" />}
        {ready && error && (
          <Alert variant="destructive">
            <AlertDescription>
              {(error as { response?: { status?: number } }).response?.status === 501
                ? 'Замечания пока недоступны: эндпоинт на бэкенде ещё не реализован.'
                : 'Не удалось загрузить замечания.'}
            </AlertDescription>
          </Alert>
        )}
        {ready && data && visible.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-gray-500">
            <ShieldCheck className="h-8 w-8 text-green-600" />
            Замечаний нет
          </div>
        )}
        <ul className="space-y-2">
          {visible.map((f) => (
            <FindingCard
              key={f.id}
              finding={f}
              selected={f.id === selectedFindingId}
              documentName={effectiveScope === 'package' ? documentNames.get(f.documentId) : undefined}
              pending={update.isPending}
              onSelect={() => onSelectFinding(f)}
              onDecide={(status) => decide(f, status)}
              onDismiss={() => setDismissing(f)}
            />
          ))}
        </ul>
      </div>

      <DismissDialog
        open={!!dismissing}
        pending={update.isPending}
        onClose={() => setDismissing(null)}
        onConfirm={(comment) => dismissing && decide(dismissing, 'dismissed', comment)}
      />
    </section>
  )
}
