import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileDown, Loader2, MousePointerClick, Upload } from 'lucide-react'
import { usePackage } from '@/features/upload'
import { DocumentPreview, DocumentTree, ReviewWorkspace, type PdfHighlight } from '@/features/review'
import { FindingsPanel, SEVERITY_STYLES, useFindings } from '@/features/findings'
import type { Finding } from '@/entities/finding'
import type { ExtractedField } from '@/entities/package'

const FIELD_HIGHLIGHT_COLOR = 'rgba(99, 102, 241, 0.3)'
import { ChecklistPanel } from '@/features/checklist'
import { ReportDialog } from '@/features/reports'
import { FieldsPanel, useDocumentDetail } from '@/features/fields'
import { Alert, AlertDescription, Button, Progress, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared'

/** Рабочая область пакета: дерево документов, просмотр оригинала и панель замечаний с подсветкой на странице. */
export function PackagePage() {
  const { id = '', packageId = '' } = useParams<{ id: string; packageId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: pkg, isLoading, error } = usePackage(packageId)
  const [reportOpen, setReportOpen] = useState(false)
  const docId = searchParams.get('doc') ?? undefined
  // Документы обрабатываются независимо: результаты доступны по мере готовности, а не после всего пакета
  const doneCount = pkg?.documents.filter((d) => d.status === 'done').length ?? 0
  const hasResults = doneCount > 0
  const processing = pkg?.status === 'queued' || pkg?.status === 'processing'
  const finished = pkg?.status === 'done' || pkg?.status === 'partial'
  const docReady = !!pkg?.documents.some((d) => d.id === docId && d.status === 'done')
  const queryClient = useQueryClient()
  const { data: findingsPage } = useFindings(id, packageId, hasResults)
  const { data: documentDetail } = useDocumentDetail(docId, docReady)

  // Появился готовый документ — подтягиваем его замечания и обновляем комплект
  useEffect(() => {
    if (doneCount === 0) return
    void queryClient.invalidateQueries({ queryKey: ['findings'] })
    void queryClient.invalidateQueries({ queryKey: ['checklist'] })
  }, [doneCount, queryClient])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (error || !pkg) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Пакет не найден или недоступен.</AlertDescription>
      </Alert>
    )
  }

  const selected = pkg.documents.find((d) => d.id === searchParams.get('doc'))
  const selectedFinding = findingsPage?.items.find((f) => f.id === searchParams.get('finding'))
  const selectedField = documentDetail?.fields.find((f) => f.key === searchParams.get('field'))
  const sourceOnPage =
    selectedFinding?.sources.find((s) => s.documentId === selected?.id && s.page) ??
    (selectedField?.source?.page ? selectedField.source : undefined)

  // Подсвечиваем открытые замечания текущего документа (и выбранное, даже если уже решено)
  const highlights: PdfHighlight[] = (findingsPage?.items ?? [])
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

  if (selectedField?.source?.page && selectedField.source.bbox && selected) {
    highlights.push({
      id: `field:${selectedField.key}`,
      page: selectedField.source.page,
      bbox: selectedField.source.bbox,
      color: FIELD_HIGHLIGHT_COLOR,
    })
  }

  const handleSelectField = (field: ExtractedField) => {
    if (!selected) return
    if (field.key === selectedField?.key) setSearchParams({ doc: selected.id }, { replace: true })
    else setSearchParams({ doc: selected.id, field: field.key }, { replace: true })
  }

  const handleSelectFinding = (f: Finding) => {
    if (f.id === selectedFinding?.id) setSearchParams({ doc: f.documentId }, { replace: true })
    else setSearchParams({ doc: f.documentId, finding: f.id }, { replace: true })
  }
  const progress = pkg.progress !== undefined ? Math.round(pkg.progress * 100) : undefined

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] flex-col sm:-m-6 sm:h-[calc(100vh-4rem)] lg:-m-8">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-3 py-2 sm:px-4">
        <Button variant="outline" size="sm" onClick={() => navigate(`/objects/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          К объекту
        </Button>
        {processing && progress !== undefined && (
          <div className="flex min-w-48 flex-1 items-center gap-3 sm:max-w-sm">
            <Progress value={progress} />
            <span className="text-sm text-gray-500 tabular-nums">{progress}%</span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={!finished}
          title={finished ? undefined : 'Отчёт доступен, когда обработаны все документы пакета'}
          onClick={() => setReportOpen(true)}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Отчёт
        </Button>
      </div>

      <div className="min-h-0 flex-1 p-0">
        <ReviewWorkspace
          className="rounded-none border-0 border-t"
          left={
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <DocumentTree
                  pkg={pkg}
                  selectedId={selected?.id}
                  onSelect={(docId) => setSearchParams({ doc: docId }, { replace: true })}
                />
              </div>
              <div className="shrink-0 border-t border-gray-200 p-2">
                <Button asChild size="sm" className="w-full">
                  <Link to={`/objects/${id}/upload`}>
                    <Upload className="mr-2 h-4 w-4" />
                    Загрузить ещё
                  </Link>
                </Button>
              </div>
            </div>
          }
          center={
            selected ? (
              <DocumentPreview
                document={selected}
                page={sourceOnPage?.page}
                highlights={highlights}
                activeHighlightId={selectedField ? `field:${selectedField.key}` : selectedFinding?.id}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-gray-500">
                <MousePointerClick className="h-8 w-8" />
                <p className="text-sm">Выберите документ в дереве слева</p>
              </div>
            )
          }
          right={
            <Tabs defaultValue="findings" className="flex h-full min-h-0 flex-col">
              <TabsList className="m-3 mb-0 grid grid-cols-3">
                <TabsTrigger value="findings">Замечания</TabsTrigger>
                <TabsTrigger value="fields">Поля</TabsTrigger>
                <TabsTrigger value="checklist">Комплект</TabsTrigger>
              </TabsList>
              <TabsContent value="findings" className="mt-0 min-h-0 flex-1">
                <FindingsPanel
                  objectId={id}
                  packageId={packageId}
                  documents={pkg.documents}
                  ready={hasResults}
                  processing={processing}
                  selectedDocumentId={selected?.id}
                  selectedFindingId={selectedFinding?.id}
                  onSelectFinding={handleSelectFinding}
                />
              </TabsContent>
              <TabsContent value="fields" className="mt-0 min-h-0 flex-1 overflow-y-auto">
                <FieldsPanel
                  documentId={selected?.id}
                  ready={selected?.status === 'done'}
                  selectedKey={selectedField?.key}
                  onSelectField={handleSelectField}
                />
              </TabsContent>
              <TabsContent value="checklist" className="mt-0 min-h-0 flex-1 overflow-y-auto">
                <ChecklistPanel
                  objectId={id}
                  packageId={packageId}
                  ready={hasResults}
                  provisional={processing}
                  onSelectDocument={(docId) => setSearchParams({ doc: docId }, { replace: true })}
                />
              </TabsContent>
            </Tabs>
          }
        />
      </div>

      <ReportDialog packageId={packageId} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  )
}
