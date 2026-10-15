import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { FileDown, FileQuestion, Loader2, MousePointerClick, ShieldCheck, Upload } from 'lucide-react'
import type { Finding } from '@/entities/finding'
import { SEVERITY_LABELS, SEVERITY_ORDER, type Severity } from '@/entities/finding'
import type { PackageDetail } from '@/entities/package'
import { DocumentStatusBadge } from '@/entities/package'
import { A4PreviewFrame, DocumentTree, ReviewWorkspace, type PdfHighlight } from '@/features/review'
import { FindingCard, SEVERITY_STYLES } from '@/features/findings'
import { Button, Progress, Tabs, TabsContent, TabsList, TabsTrigger, cn } from '@/shared'
import type { DemoCheckResult } from '../model/demoApi'
import { buildDemoPackage, mapDemoFindingsToFindings } from '../model/buildDemoPackage'

const PdfViewer = lazy(() => import('@/features/review/ui/PdfViewer').then((m) => ({ default: m.PdfViewer })))

interface DemoPackageWorkspaceProps {
  files: File[]
  result: DemoCheckResult
  /** 0..100 во время имитации обработки; undefined — готово */
  progress?: number
  onLead: () => void
}

function countBySeverity(items: Finding[], documentId?: string): Record<Severity, number> {
  const base: Record<Severity, number> = { critical: 0, error: 0, warning: 0, info: 0 }
  for (const f of items) {
    if (documentId && f.documentId !== documentId) continue
    base[f.severity] += 1
  }
  return base
}

/** Workspace демо-проверки — layout как PackagePage, данные локальные. */
export function DemoPackageWorkspace({ files, result, progress, onLead }: DemoPackageWorkspaceProps) {
  const processing = progress !== undefined
  const pkg: PackageDetail = useMemo(() => {
    const detail = buildDemoPackage(files)
    if (processing) {
      detail.status = 'processing'
      detail.progress = (progress ?? 0) / 100
      detail.documents = detail.documents.map((d) => ({ ...d, status: 'processing' as const }))
    }
    return detail
  }, [files, processing, progress])

  const findings = useMemo(
    () => (processing ? [] : mapDemoFindingsToFindings(result, pkg.documents, pkg.id)),
    [processing, result, pkg.documents, pkg.id]
  )

  const [selectedDocId, setSelectedDocId] = useState<string | undefined>(pkg.documents[0]?.id)
  const [selectedFindingId, setSelectedFindingId] = useState<string | undefined>()
  const [scope, setScope] = useState<'document' | 'package'>('document')
  const [statusView, setStatusView] = useState<'open' | 'all'>('open')
  const [severities, setSeverities] = useState<Severity[]>([])
  const [localFindings, setLocalFindings] = useState<Finding[]>(findings)

  useEffect(() => {
    setLocalFindings(findings)
  }, [findings])

  useEffect(() => {
    if (!selectedDocId && pkg.documents[0]) setSelectedDocId(pkg.documents[0].id)
  }, [pkg.documents, selectedDocId])

  const fileByDocId = useMemo(() => {
    const map = new Map<string, File>()
    pkg.documents.forEach((doc, i) => {
      const file = files[i]
      if (file) map.set(doc.id, file)
    })
    return map
  }, [files, pkg.documents])

  const blobUrls = useMemo(() => {
    const map = new Map<string, string>()
    for (const [id, file] of fileByDocId) {
      map.set(id, URL.createObjectURL(file))
    }
    return map
  }, [fileByDocId])

  useEffect(() => {
    return () => {
      for (const url of blobUrls.values()) URL.revokeObjectURL(url)
    }
  }, [blobUrls])

  const selected = pkg.documents.find((d) => d.id === selectedDocId)
  const selectedFinding = localFindings.find((f) => f.id === selectedFindingId)
  const selectedFile = selectedDocId ? fileByDocId.get(selectedDocId) : undefined
  const fileUrl = selectedDocId ? blobUrls.get(selectedDocId) : undefined
  const isPdf = selected?.mimeType === 'application/pdf' || selectedFile?.name.toLowerCase().endsWith('.pdf')

  const page =
    selectedFinding?.sources.find((s) => s.documentId === selected?.id && s.page)?.page ?? undefined

  const highlights: PdfHighlight[] = localFindings
    .filter((f) => f.documentId === selected?.id && (f.status === 'open' || f.id === selectedFinding?.id))
    .flatMap((f) =>
      f.sources
        .filter((s) => s.documentId === f.documentId && s.page && s.bbox)
        .map((s, i) => ({
          id: i === 0 ? f.id : `${f.id}:${i}`,
          page: s.page!,
          bbox: s.bbox!,
          color: SEVERITY_STYLES[f.severity].highlight,
        }))
    )

  const documentNames = useMemo(() => new Map(pkg.documents.map((d) => [d.id, d.fileName])), [pkg.documents])
  const effectiveScope = selectedDocId ? scope : 'package'
  const filterDocId = effectiveScope === 'document' ? selectedDocId : undefined
  const visible = localFindings.filter((f) => {
    if (filterDocId && f.documentId !== filterDocId) return false
    if (statusView === 'open' && f.status !== 'open') return false
    if (severities.length > 0 && !severities.includes(f.severity)) return false
    return true
  })
  const counts = countBySeverity(localFindings, filterDocId)

  const toggleSeverity = (s: Severity) =>
    setSeverities((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  const decide = (finding: Finding, status: Finding['status']) => {
    setLocalFindings((prev) => prev.map((f) => (f.id === finding.id ? { ...f, status } : f)))
  }

  const cabinetStub = (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-gray-500">
      <p>Полный разбор полей и комплекта доступен в кабинете после подключения.</p>
      <Button type="button" size="sm" onClick={onLead}>
        Оставить заявку
      </Button>
    </div>
  )

  const centerPane = selected ? (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-2">
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{selected.fileName}</h2>
        <DocumentStatusBadge status={selected.status} />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-gray-100">
        {processing && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        )}
        {!processing && fileUrl && isPdf && (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            }
          >
            <PdfViewer
              fileUrl={fileUrl}
              page={page}
              highlights={highlights}
              activeHighlightId={selectedFinding?.id}
            />
          </Suspense>
        )}
        {!processing && fileUrl && !isPdf && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-gray-500">
            <FileQuestion className="h-10 w-10" />
            <p className="text-sm">Предпросмотр доступен только для PDF.</p>
          </div>
        )}
        {!processing && !fileUrl && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-gray-500">
            <FileQuestion className="h-10 w-10" />
            <p className="text-sm">Файл недоступен для предпросмотра.</p>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-gray-500">
      <MousePointerClick className="h-8 w-8" />
      <p className="text-sm">Выберите документ в дереве слева</p>
    </div>
  )

  const rightPane = (
    <Tabs defaultValue="findings" className="flex h-full min-h-0 flex-col">
      <TabsList className="m-3 mb-0 grid grid-cols-3">
        <TabsTrigger value="findings">Замечания</TabsTrigger>
        <TabsTrigger value="fields">Поля</TabsTrigger>
        <TabsTrigger value="checklist">Комплект</TabsTrigger>
      </TabsList>
      <TabsContent value="findings" className="mt-0 min-h-0 flex-1">
        <section aria-label="Замечания" className="flex h-full min-h-0 flex-col">
          <div className="space-y-2 border-b border-gray-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Замечания</h2>
              <div className="inline-flex rounded-md border border-gray-200 text-xs" role="group">
                {(['open', 'all'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={statusView === v}
                    onClick={() => setStatusView(v)}
                    className={cn(
                      'px-2 py-1 first:rounded-l-md last:rounded-r-md',
                      statusView === v ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
                    )}
                  >
                    {v === 'open' ? 'Открытые' : 'Все'}
                  </button>
                ))}
              </div>
            </div>
            {selectedDocId && (
              <div className="inline-flex rounded-md border border-gray-200 text-xs" role="group">
                {(['document', 'package'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={scope === v}
                    onClick={() => setScope(v)}
                    className={cn(
                      'px-2 py-1 first:rounded-l-md last:rounded-r-md',
                      scope === v ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
                    )}
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
            {processing && (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Идёт обработка — замечания появятся, как только будет готов первый документ.
              </p>
            )}
            {!processing && visible.length === 0 && (
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
                  onSelect={() => {
                    setSelectedFindingId(f.id)
                    setSelectedDocId(f.documentId)
                  }}
                  onDecide={(status) => decide(f, status)}
                  onDismiss={onLead}
                />
              ))}
            </ul>
          </div>
        </section>
      </TabsContent>
      <TabsContent value="fields" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        {cabinetStub}
      </TabsContent>
      <TabsContent value="checklist" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        {cabinetStub}
      </TabsContent>
    </Tabs>
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {processing && progress !== undefined && (
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-3 py-2">
          <div className="flex min-w-48 flex-1 items-center gap-3 sm:max-w-sm">
            <Progress value={progress} />
            <span className="text-sm text-gray-500 tabular-nums">{progress}%</span>
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <ReviewWorkspace
          className="rounded-none border-0 border-t"
          left={
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <DocumentTree pkg={pkg} selectedId={selected?.id} onSelect={setSelectedDocId} />
              </div>
              <div className="shrink-0 border-t border-gray-200 p-2">
                <Button size="sm" className="w-full" onClick={onLead}>
                  <Upload className="mr-2 h-4 w-4" />
                  Проверить ещё
                </Button>
              </div>
            </div>
          }
          center={<A4PreviewFrame>{centerPane}</A4PreviewFrame>}
          right={
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-1">{rightPane}</div>
              <div className="shrink-0 border-t border-gray-200 p-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={processing}
                  onClick={onLead}
                  title="Отчёт и сохранение — по заявке на подключение"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Отчёт
                </Button>
              </div>
            </div>
          }
        />
      </div>
    </div>
  )
}
