import type { Finding, Severity } from '@/entities/finding'
import type { PackageDetail, PackageDocument, SeverityCounts } from '@/entities/package'
import type { DemoCheckResult, DemoFinding } from './demoApi'

const emptyCounts = (): SeverityCounts => ({ error: 0, warning: 0, info: 0, critical: 0 })

function mapSeverity(s?: DemoFinding['severity']): Severity {
  if (s === 'error') return 'error'
  if (s === 'info') return 'info'
  return 'warning'
}

/** Браузер часто отдаёт пустой `file.type` — определяем по расширению для превью. */
function guessMimeType(file: File): string {
  if (file.type) return file.type
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (name.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  if (name.endsWith('.csv')) return 'text/csv'
  return 'application/octet-stream'
}

/** Собирает PackageDetail из локальных файлов (для DocumentTree). */
export function buildDemoPackage(files: File[], packageId = 'demo-pkg'): PackageDetail {
  const now = new Date().toISOString()
  const documents: PackageDocument[] = files.map((file, index) => ({
    id: `demo-doc-${index}`,
    objectId: 'demo-object',
    packageId,
    fileName: file.name,
    mimeType: guessMimeType(file),
    sizeBytes: file.size,
    type: 'unknown',
    status: 'done',
    stages: {},
    findings: emptyCounts(),
    createdAt: now,
  }))

  return {
    id: packageId,
    objectId: 'demo-object',
    version: 1,
    status: 'done',
    progress: 1,
    createdAt: now,
    documents,
  }
}

/** Мапит ответ demo/check в Finding[] кабинета. */
export function mapDemoFindingsToFindings(
  result: DemoCheckResult,
  documents: PackageDocument[],
  packageId = 'demo-pkg'
): Finding[] {
  const now = new Date().toISOString()
  const fallbackDocId = documents[0]?.id ?? 'demo-doc-0'

  const findings = result.findings.map((f, index) => {
    const documentId = documents[Math.min(index, Math.max(documents.length - 1, 0))]?.id ?? fallbackDocId
    const severity = mapSeverity(f.severity)
    return {
      id: f.id || `demo-finding-${index}`,
      objectId: 'demo-object',
      documentId,
      packageId,
      ruleId: 'demo-rule',
      ruleVersion: '1',
      severity,
      message: f.title,
      explanation: result.mock
        ? 'Демо-результат интерфейса. В кабинете здесь появятся замечания по вашим документам.'
        : null,
      sources: [
        {
          documentId,
          page: f.page,
          quote: f.quote,
        },
      ],
      confidence: 0.8,
      status: 'open' as const,
      createdAt: now,
      updatedAt: now,
    } satisfies Finding
  })

  // Проставляем счётчики в документах
  for (const doc of documents) {
    const counts = emptyCounts()
    for (const f of findings) {
      if (f.documentId === doc.id) counts[f.severity] += 1
    }
    doc.findings = counts
  }

  return findings
}
