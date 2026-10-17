import type {
  DocumentType,
  Package,
  PackageCreate,
  PackageCreated,
  PackageDetail,
  Checklist,
  PackageDocument,
  Stage,
  StageState,
} from '@/entities/package'
import { resetMockFields } from './fields'
import { resetMockReports } from './reports'
import { ensureFindings, openCounts, resetMockFindings } from './findings'

interface MockPackage {
  pkg: Package
  documents: PackageDocument[]
  startedAt?: number
}

interface MockFileBody {
  body: ArrayBuffer
  contentType: string
}

const packages = new Map<string, MockPackage>()
const knownHashes = new Map<string, string>() // sha256 → documentId
const uploaded = new Set<string>()
/** Байты, принятые через PUT /api/__mocks__/upload/:documentId */
const fileBodies = new Map<string, MockFileBody>()

const STAGES: Stage[] = ['extract', 'classify', 'parse', 'rules', 'explain']
const PROCESS_MS = 6000

let counter = 0
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++counter}`

function guessType(fileName: string): DocumentType {
  const n = fileName.toLowerCase()
  if (n.includes('аоср') || n.includes('aosr')) return 'aosr'
  if (n.includes('журнал')) return 'general_work_log'
  if (n.includes('паспорт')) return 'material_passport'
  if (n.includes('схем')) return 'as_built_scheme'
  return 'unknown'
}

export function createMockPackage(objectId: string, body: PackageCreate): PackageCreated {
  const version = [...packages.values()].filter((p) => p.pkg.objectId === objectId).length + 1
  const pkg: Package = {
    id: uid('pkg'),
    objectId,
    version,
    status: 'uploading',
    progress: 0,
    createdAt: new Date().toISOString(),
  }
  const documents: PackageDocument[] = []
  const uploads: PackageCreated['uploads'] = []
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString()

  for (const f of body.files) {
    const duplicateOf = f.sha256 ? (knownHashes.get(f.sha256) ?? null) : null
    const documentId = uid('doc')
    documents.push({
      id: documentId,
      objectId,
      packageId: pkg.id,
      fileName: f.fileName,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      pageCount: f.mimeType === 'application/pdf' ? 3 : null,
      type: 'unknown',
      status: duplicateOf ? 'uploaded' : 'awaiting_upload',
      stages: {},
      findings: { error: 0, warning: 0, info: 0, critical: 0 },
      createdAt: pkg.createdAt,
    })
    if (duplicateOf) {
      uploaded.add(documentId)
    } else if (f.sha256) {
      knownHashes.set(f.sha256, documentId)
    }
    uploads.push({
      documentId,
      fileName: f.fileName,
      uploadUrl: duplicateOf ? null : `/api/__mocks__/upload/${documentId}`,
      headers: duplicateOf ? undefined : { 'Content-Type': f.mimeType },
      expiresAt: duplicateOf ? undefined : expiresAt,
      duplicateOf,
    })
  }

  packages.set(pkg.id, { pkg, documents })
  return { package: pkg, uploads }
}

/** Сохраняет тело PUT и помечает документ загруженным. */
export function storeMockUploadedFile(
  documentId: string,
  body: ArrayBuffer,
  contentType: string
): boolean {
  if (!markMockUploaded(documentId)) return false
  fileBodies.set(documentId, { body, contentType })
  return true
}

export function getMockFileBody(documentId: string): MockFileBody | null {
  return fileBodies.get(documentId) ?? null
}

/** Signed-URL-like ответ для GET /documents/:id/file. */
export function getMockDocumentFile(documentId: string): { url: string; expiresAt: string } | null {
  if (!getMockDocument(documentId)) return null
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString()
  if (fileBodies.has(documentId)) {
    return { url: `/api/__mocks__/files/${documentId}`, expiresAt }
  }
  // Документ без локального тела (дубликат / старый мок) — тестовый PDF
  return { url: '/mock-docs/sample.pdf', expiresAt }
}

export function markMockUploaded(documentId: string): boolean {
  for (const p of packages.values()) {
    const doc = p.documents.find((d) => d.id === documentId)
    if (doc) {
      doc.status = 'uploaded'
      uploaded.add(documentId)
      return true
    }
  }
  return false
}

/** null — пакет не найден; 'not_uploaded' — не все файлы загружены (409). */
export function startMockPackage(packageId: string): Package | 'not_found' | 'not_uploaded' {
  const p = packages.get(packageId)
  if (!p) return 'not_found'
  if (!p.startedAt) {
    if (p.documents.some((d) => !uploaded.has(d.id))) return 'not_uploaded'
    p.startedAt = Date.now()
  }
  return computeMockPackage(p)
}

function computeMockPackage(p: MockPackage): PackageDetail {
  if (!p.startedAt) return { ...p.pkg, documents: p.documents }

  const elapsed = Date.now() - p.startedAt
  const progress = Math.min(1, elapsed / PROCESS_MS)
  const finished = progress >= 1

  const documents = p.documents.map((doc, i): PackageDocument => {
    // Сканы/нераспознаваемые форматы в моках не обрабатываем: CSV → needs_ocr для демонстрации статуса
    if (doc.mimeType === 'text/csv') {
      return { ...doc, status: 'needs_ocr' }
    }
    // Документы заканчиваются в разное время (по мере обработки), к концу пакета готовы все
    const docProgress = finished ? 1 : Math.min(1, Math.max(0, progress * 1.6 - i * 0.2))
    const doneStages = Math.floor(docProgress * STAGES.length)
    const stages: Partial<Record<Stage, StageState>> = {}
    STAGES.forEach((stage, idx) => {
      stages[stage] = {
        status: idx < doneStages ? 'succeeded' : idx === doneStages && docProgress < 1 ? 'running' : 'pending',
      }
    })
    const done = docProgress >= 1
    if (done) ensureFindings(doc)
    return {
      ...doc,
      type: doneStages > 1 ? guessType(doc.fileName) : 'unknown',
      status: done ? 'done' : 'processing',
      stages,
      findings: done ? openCounts(doc.id) : doc.findings,
    }
  })

  const status = finished ? 'done' : progress < 0.1 ? 'queued' : 'processing'
  p.pkg.status = status
  p.pkg.progress = progress
  return { ...p.pkg, documents }
}

export function getMockPackage(packageId: string): PackageDetail | null {
  const p = packages.get(packageId)
  return p ? computeMockPackage(p) : null
}

/** Список пакетов объекта (новые сверху), как GET /objects/:id/packages. */
export function listMockPackages(objectId: string): Package[] {
  return [...packages.values()]
    .filter((p) => p.pkg.objectId === objectId)
    .map((p) => {
      const detail = computeMockPackage(p)
      return {
        id: detail.id,
        objectId: detail.objectId,
        version: detail.version,
        status: detail.status,
        progress: detail.progress,
        createdAt: detail.createdAt,
      }
    })
    .sort((a, b) => b.version - a.version)
}

/** Документы пакета, по которым обработка завершена (для списка замечаний). */
export function doneMockDocumentIds(packageId: string): string[] | null {
  const pkg = getMockPackage(packageId)
  return pkg ? pkg.documents.filter((d) => d.status === 'done').map((d) => d.id) : null
}

export function latestMockPackageId(objectId: string): string | null {
  const list = [...packages.values()].filter((p) => p.pkg.objectId === objectId)
  return list.at(-1)?.pkg.id ?? null
}

// Обязательные документы для комплекта (в моках одинаковые для всех объектов)
const REQUIRED: { type: DocumentType; title: string; required: number }[] = [
  { type: 'aosr', title: 'Акты освидетельствования скрытых работ', required: 2 },
  { type: 'general_work_log', title: 'Общий журнал работ', required: 1 },
  { type: 'concrete_log', title: 'Журнал бетонных работ', required: 1 },
  { type: 'material_passport', title: 'Паспорта материалов', required: 2 },
  { type: 'as_built_scheme', title: 'Исполнительные схемы', required: 1 },
]

export function getMockChecklist(packageId: string): Checklist | null {
  const pkg = getMockPackage(packageId)
  if (!pkg) return null
  const items = REQUIRED.map(({ type, title, required }) => {
    const documentIds = pkg.documents.filter((d) => d.type === type && d.status === 'done').map((d) => d.id)
    const found = documentIds.length
    return {
      documentType: type,
      title,
      required,
      found,
      status: found === 0 ? ('missing' as const) : found >= required ? ('complete' as const) : ('partial' as const),
      documentIds,
    }
  })
  const complete = items.filter((i) => i.status === 'complete').length
  return { readiness: complete / items.length, items }
}

export function getMockDocument(documentId: string): PackageDocument | null {
  for (const p of packages.values()) {
    const doc = computeMockPackage(p).documents.find((d) => d.id === documentId)
    if (doc) return doc
  }
  return null
}

export function resetMockPackages() {
  resetMockFindings()
  resetMockFields()
  resetMockReports()
  packages.clear()
  uploaded.clear()
  knownHashes.clear()
  fileBodies.clear()
}
