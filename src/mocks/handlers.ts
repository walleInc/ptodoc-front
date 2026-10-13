import { http, HttpResponse, delay, sse } from 'msw'
import type { ConstructionObject, ObjectStatus } from '@/entities/object'

import {
  SESSION_COOKIE,
  MOCK_PASSWORD,
  findMockUserByEmail,
  findMockUserById,
} from './data/auth'
import type { PackageCreate } from '@/entities/package'
import { getMockFields, updateMockFields } from './data/fields'
import { listFindings, updateFinding } from './data/findings'
import { createMockReport, getMockReport } from './data/reports'
import type { ReportCreate } from '@/entities/report'
import {
  FINISHED_PACKAGE_STATUSES,
  type DocumentStageEvent,
  type PackageProgressEvent,
  type Stage,
} from '@/entities/package'
import type { FindingUpdate } from '@/entities/finding'
import {
  createMockPackage,
  doneMockDocumentIds,
  latestMockPackageId,
  getMockChecklist,
  getMockDocument,
  getMockDocumentFile,
  getMockFileBody,
  getMockPackage,
  listMockPackages,
  resetMockPackages,
  startMockPackage,
  storeMockUploadedFile,
} from './data/packages'
import {
  mockObjects,
  mockObjectTypes,
  mockWorkTypes,
  mockCounterparties,
  resetMockObjects,
} from './data/objects'

interface ObjectWriteInput {
  code: string
  name: string
  objectTypeId: string
  workTypeIds: string[]
  address?: string
  customerOrganizationId?: string
  contractorOrganizationId?: string
  description?: string
}

type StatusTransition = Exclude<ObjectStatus, 'archived'>

const ALLOWED_TRANSITIONS: Record<ObjectStatus, StatusTransition[]> = {
  draft: ['active'],
  active: ['on_hold', 'completed'],
  on_hold: ['active', 'completed'],
  completed: [],
  archived: [],
}

const DELAY = 300

async function withDelay<T>(fn: () => T): Promise<T> {
  await delay(DELAY)
  return fn()
}

// Мок cookie-сессии: браузер игнорирует Set-Cookie из Service Worker.
// Клиент шлёт X-Mock-Session из sessionStorage; плюс module-level fallback в рамках SW.
let mockSessionUserId: string | null = null
const MOCK_SESSION_HEADER = 'X-Mock-Session'

function sessionUser(request: Request, cookies: Record<string, string>) {
  const fromHeader = request.headers.get(MOCK_SESSION_HEADER)
  const fromCookie = cookies[SESSION_COOKIE]
  return findMockUserById(fromHeader || fromCookie || mockSessionUserId || undefined)
}

const unauthorized = () => HttpResponse.json({ code: 'unauthorized', message: 'Unauthorized' }, { status: 401 })
const notFound = () => HttpResponse.json({ code: 'not_found', message: 'Объект не найден' }, { status: 404 })

function parseQuery(url: string) {
  const { searchParams } = new URL(url)
  const params: Record<string, string | string[]> = {}
  searchParams.forEach((value, key) => {
    const prev = params[key]
    if (prev !== undefined) {
      params[key] = Array.isArray(prev) ? [...prev, value] : [prev, value]
    } else {
      params[key] = value
    }
  })
  return params
}

const orgRef = (id?: string) => {
  const org = mockCounterparties.find((o) => o.id === id)
  return org ? { id: org.id, name: org.name } : null
}

const codeTaken = (code: string, exceptId?: string) =>
  mockObjects.some((o) => o.code.toLowerCase() === code.toLowerCase() && o.id !== exceptId)

export const handlers = [
  // === AUTH (cookie-сессия) ===
  http.post('/api/auth/login', async ({ request }) => {
    return withDelay(async () => {
      const body = (await request.json()) as { email?: string; password?: string }
      const user = findMockUserByEmail(body.email)
      if (user && body.password === MOCK_PASSWORD) {
        mockSessionUserId = user.id
        return HttpResponse.json(user, {
          headers: { 'Set-Cookie': `${SESSION_COOKIE}=${user.id}; Path=/; SameSite=Lax` },
        })
      }
      return HttpResponse.json({ code: 'unauthorized', message: 'Неверный email или пароль' }, { status: 401 })
    })
  }),

  http.post('/api/auth/logout', async () => {
    mockSessionUserId = null
    return withDelay(
      () =>
        new HttpResponse(null, {
          status: 204,
          headers: { 'Set-Cookie': `${SESSION_COOKIE}=; Path=/; Max-Age=0` },
        })
    )
  }),

  http.get('/api/auth/me', async ({ request, cookies }) => {
    const user = sessionUser(request, cookies)
    if (!user) return unauthorized()
    return withDelay(() => HttpResponse.json(user))
  }),

  // === OBJECTS ===
  http.get('/api/objects', async ({ request, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()

    return withDelay(() => {
      const params = parseQuery(request.url)
      const includeArchived = params.includeArchived === 'true'
      return HttpResponse.json(mockObjects.filter((o) => includeArchived || o.status !== 'archived'))
    })
  }),

  http.post('/api/objects', async ({ request, cookies }) => {
    const user = sessionUser(request, cookies)
    if (!user) return unauthorized()

    return withDelay(async () => {
      const body = (await request.json()) as ObjectWriteInput
      if (codeTaken(body.code)) {
        return HttpResponse.json({ code: 'conflict', message: 'Object code already exists' }, { status: 409 })
      }
      const now = new Date().toISOString()
      const newObject: ConstructionObject = {
        id: `obj-${Date.now()}`,
        code: body.code,
        name: body.name,
        address: body.address ?? null,
        status: 'draft',
        description: body.description ?? null,
        objectType: mockObjectTypes.find((ot) => ot.id === body.objectTypeId)!,
        customer: orgRef(body.customerOrganizationId),
        contractor: orgRef(body.contractorOrganizationId),
        workTypes: mockWorkTypes.filter((wt) => body.workTypeIds?.includes(wt.id)),
        startDate: null,
        plannedEndDate: null,
        actualEndDate: null,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      }
      mockObjects.unshift(newObject)
      return HttpResponse.json(newObject, { status: 201 })
    })
  }),

  http.get('/api/objects/:id', async ({ request, params, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()

    return withDelay(() => {
      const object = mockObjects.find((o) => o.id === params.id)
      return object ? HttpResponse.json(object) : notFound()
    })
  }),

  http.patch('/api/objects/:id', async ({ request, params, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()

    return withDelay(async () => {
      const body = (await request.json()) as Partial<ObjectWriteInput>
      const index = mockObjects.findIndex((o) => o.id === params.id)
      if (index === -1) return notFound()
      const existing = mockObjects[index]!
      if (existing.status === 'archived') {
        return HttpResponse.json({ code: 'conflict', message: 'Archived object is read-only' }, { status: 409 })
      }
      if (body.code && codeTaken(body.code, existing.id)) {
        return HttpResponse.json({ code: 'conflict', message: 'Object code already exists' }, { status: 409 })
      }
      const updated: ConstructionObject = {
        ...existing,
        code: body.code ?? existing.code,
        name: body.name ?? existing.name,
        address: 'address' in body ? body.address ?? null : existing.address,
        description: 'description' in body ? body.description ?? null : existing.description,
        objectType: mockObjectTypes.find((ot) => ot.id === body.objectTypeId) ?? existing.objectType,
        customer: 'customerOrganizationId' in body ? orgRef(body.customerOrganizationId) : existing.customer,
        contractor: 'contractorOrganizationId' in body ? orgRef(body.contractorOrganizationId) : existing.contractor,
        workTypes: body.workTypeIds
          ? mockWorkTypes.filter((wt) => body.workTypeIds!.includes(wt.id))
          : existing.workTypes,
        updatedAt: new Date().toISOString(),
      }
      mockObjects[index] = updated
      return HttpResponse.json(updated)
    })
  }),

  http.post('/api/objects/:id/status', async ({ request, params, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()

    return withDelay(async () => {
      const { status } = (await request.json()) as { status: StatusTransition }
      const index = mockObjects.findIndex((o) => o.id === params.id)
      if (index === -1) return notFound()
      const existing = mockObjects[index]!
      if (!ALLOWED_TRANSITIONS[existing.status].includes(status)) {
        return HttpResponse.json({ code: 'conflict', message: 'Status transition not allowed' }, { status: 409 })
      }
      const now = new Date().toISOString()
      const updated: ConstructionObject = {
        ...existing,
        status,
        actualEndDate: status === 'completed' ? now.slice(0, 10) : existing.actualEndDate,
        updatedAt: now,
      }
      mockObjects[index] = updated
      return HttpResponse.json(updated)
    })
  }),

  http.post('/api/objects/:id/archive', async ({ request, params, cookies }) => {
    const user = sessionUser(request, cookies)
    if (!user) return unauthorized()
    if (user.role !== 'owner') {
      return HttpResponse.json({ code: 'forbidden', message: 'Only owner can archive objects' }, { status: 403 })
    }

    return withDelay(() => {
      const index = mockObjects.findIndex((o) => o.id === params.id)
      if (index === -1) return notFound()
      const existing = mockObjects[index]!
      if (existing.status === 'archived') {
        return HttpResponse.json({ code: 'conflict', message: 'Object already archived' }, { status: 409 })
      }
      const now = new Date().toISOString()
      const updated: ConstructionObject = { ...existing, status: 'archived', archivedAt: now, updatedAt: now }
      mockObjects[index] = updated
      return HttpResponse.json(updated)
    })
  }),

  // === PACKAGES / UPLOAD ===
  http.get('/api/objects/:id/packages', async ({ request, params, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()
    return withDelay(() => {
      if (!mockObjects.some((o) => o.id === params.id)) return notFound()
      return HttpResponse.json(listMockPackages(String(params.id)))
    })
  }),

  http.post('/api/objects/:id/packages', async ({ request, params, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()

    return withDelay(async () => {
      if (!mockObjects.some((o) => o.id === params.id)) return notFound()
      const body = (await request.json()) as PackageCreate
      if (!body.files?.length) {
        return HttpResponse.json({ code: 'validation_error', message: 'Нужен хотя бы один файл' }, { status: 422 })
      }
      return HttpResponse.json(createMockPackage(String(params.id), body), { status: 201 })
    })
  }),

  // Имитация presigned PUT в объектное хранилище (без авторизации, как у S3)
  http.put('/api/__mocks__/upload/:documentId', async ({ request, params }) => {
    await delay(400)
    const documentId = String(params.documentId)
    const body = await request.arrayBuffer()
    const contentType = request.headers.get('Content-Type') || 'application/octet-stream'
    return storeMockUploadedFile(documentId, body, contentType)
      ? new HttpResponse(null, { status: 200 })
      : new HttpResponse(null, { status: 404 })
  }),

  // Отдача загруженных байт по ссылке из GET /documents/:id/file
  http.get('/api/__mocks__/files/:documentId', ({ params }) => {
    const file = getMockFileBody(String(params.documentId))
    if (!file) return new HttpResponse(null, { status: 404 })
    return new HttpResponse(file.body, {
      headers: { 'Content-Type': file.contentType },
    })
  }),

  http.post('/api/packages/:id/start', async ({ request, params, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()

    return withDelay(() => {
      const result = startMockPackage(String(params.id))
      if (result === 'not_found') return HttpResponse.json({ code: 'not_found', message: 'Пакет не найден' }, { status: 404 })
      if (result === 'not_uploaded') {
        return HttpResponse.json({ code: 'conflict', message: 'Загружены не все файлы' }, { status: 409 })
      }
      return HttpResponse.json(result, { status: 202 })
    })
  }),

  http.get('/api/packages/:id', async ({ request, params, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()
    const pkg = getMockPackage(String(params.id))
    return pkg
      ? HttpResponse.json(pkg)
      : HttpResponse.json({ code: 'not_found', message: 'Пакет не найден' }, { status: 404 })
  }),

  // === DOCUMENTS / FIELDS ===
  http.get('/api/documents/:id', async ({ request, params, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()
    return withDelay(() => {
      const doc = getMockDocument(String(params.id))
      if (!doc) return HttpResponse.json({ code: 'not_found', message: 'Документ не найден' }, { status: 404 })
      const fields = doc.status === 'done' ? getMockFields(doc.id) : []
      return HttpResponse.json({ ...doc, fields, lowConfidenceThreshold: 0.8 })
    })
  }),

  http.patch('/api/documents/:id/fields', async ({ request, params, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()
    const body = (await request.json()) as { fields?: { key: string; value: string | null }[] }
    return withDelay(() => {
      const doc = getMockDocument(String(params.id))
      if (!doc) return HttpResponse.json({ code: 'not_found', message: 'Документ не найден' }, { status: 404 })
      if (!body.fields?.length || updateMockFields(doc.id, body.fields) === 'unknown_key') {
        return HttpResponse.json({ code: 'validation_error', message: 'Неизвестное поле документа' }, { status: 422 })
      }
      return HttpResponse.json({ ...doc, fields: getMockFields(doc.id), lowConfidenceThreshold: 0.8 })
    })
  }),

  http.get('/api/objects/:id/checklist', async ({ request, params, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()
    const packageId = new URL(request.url).searchParams.get('packageId') ?? latestMockPackageId(String(params.id))
    const checklist = packageId ? getMockChecklist(packageId) : null
    if (!checklist) return HttpResponse.json({ code: 'not_found', message: 'Пакет не найден' }, { status: 404 })
    return withDelay(() => HttpResponse.json(checklist))
  }),

  // SSE: сразу текущее состояние пакета, дальше `progress` и `document.stage` при каждом изменении
  sse<{ progress: PackageProgressEvent; 'document.stage': DocumentStageEvent }>(
    '/api/packages/:id/events',
    ({ params, client }) => {
      const packageId = String(params.id)
      const seenStages = new Map<string, string>()
      let seenProgress = ''

      function tick(): boolean {
        const pkg = getMockPackage(packageId)
        if (!pkg) {
          client.close()
          return true
        }

        for (const doc of pkg.documents) {
          for (const [stage, state] of Object.entries(doc.stages)) {
            const key = `${doc.id}:${stage}`
            if (seenStages.get(key) === state.status) continue
            seenStages.set(key, state.status)
            client.send({
              event: 'document.stage',
              data: { type: 'document.stage', packageId, documentId: doc.id, stage: stage as Stage, status: state.status },
            })
          }
        }

        const progress = `${pkg.status}:${(pkg.progress ?? 0).toFixed(2)}`
        if (progress !== seenProgress) {
          seenProgress = progress
          client.send({
            event: 'progress',
            data: { type: 'progress', packageId, status: pkg.status, progress: pkg.progress ?? 0 },
          })
        }

        if (FINISHED_PACKAGE_STATUSES.includes(pkg.status)) {
          client.close()
          return true
        }
        return false
      }

      if (tick()) return
      const timer = setInterval(() => {
        try {
          if (tick()) clearInterval(timer)
        } catch {
          clearInterval(timer) // клиент отключился — поток закрыт
        }
      }, 500)
    }
  ),

  // === REPORTS ===
  http.post('/api/packages/:id/reports', async ({ request, params, cookies }) => {
    const user = sessionUser(request, cookies)
    if (!user) return unauthorized()
    const body = (await request.json().catch(() => ({}))) as ReportCreate
    return withDelay(() => {
      const pkg = getMockPackage(String(params.id))
      if (!pkg) return HttpResponse.json({ code: 'not_found', message: 'Пакет не найден' }, { status: 404 })
      if (pkg.status !== 'done' && pkg.status !== 'partial') {
        return HttpResponse.json({ code: 'conflict', message: 'Обработка пакета ещё не завершена' }, { status: 409 })
      }
      return HttpResponse.json(createMockReport(pkg.objectId, pkg.id, body, user.id), { status: 202 })
    })
  }),

  http.get('/api/reports/:id', async ({ request, params, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()
    const report = getMockReport(String(params.id))
    return report
      ? HttpResponse.json(report)
      : HttpResponse.json({ code: 'not_found', message: 'Отчёт не найден' }, { status: 404 })
  }),

  http.get('/api/reports/:id/download', async ({ request, params, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()
    const report = getMockReport(String(params.id))
    if (!report) return HttpResponse.json({ code: 'not_found', message: 'Отчёт не найден' }, { status: 404 })
    if (report.status !== 'ready') {
      return HttpResponse.json({ code: 'conflict', message: 'Отчёт ещё не готов' }, { status: 409 })
    }
    // В моках отдаём тестовый PDF как содержимое отчёта
    const pdf = await fetch('/mock-docs/sample.pdf').then((r) => r.arrayBuffer())
    return new HttpResponse(pdf, { headers: { 'Content-Type': 'application/pdf' } })
  }),

  // === FINDINGS ===
  http.get('/api/objects/:id/findings', async ({ request, params, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()
    const query = new URL(request.url).searchParams
    const packageId = query.get('packageId') ?? latestMockPackageId(String(params.id))
    const documentIds = packageId ? doneMockDocumentIds(packageId) : []
    if (!documentIds) return HttpResponse.json({ code: 'not_found', message: 'Пакет не найден' }, { status: 404 })
    return withDelay(() => HttpResponse.json(listFindings(documentIds, query)))
  }),

  http.patch('/api/findings/:id', async ({ request, params, cookies }) => {
    const user = sessionUser(request, cookies)
    if (!user) return unauthorized()
    const body = (await request.json()) as FindingUpdate
    return withDelay(() => {
      const result = updateFinding(String(params.id), body, user.id)
      if (result === 'not_found') {
        return HttpResponse.json({ code: 'not_found', message: 'Замечание не найдено' }, { status: 404 })
      }
      if (result === 'comment_required') {
        return HttpResponse.json(
          {
            code: 'validation_error',
            message: 'Для отклонения замечания нужен комментарий',
            details: [{ field: 'comment', message: 'required' }],
          },
          { status: 422 }
        )
      }
      return HttpResponse.json(result)
    })
  }),

  http.get('/api/documents/:id/file', async ({ request, params, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()
    return withDelay(() => {
      const file = getMockDocumentFile(String(params.id))
      if (!file) {
        return HttpResponse.json({ code: 'not_found', message: 'Документ не найден' }, { status: 404 })
      }
      return HttpResponse.json(file)
    })
  }),

  // === CATALOGS ===
  http.get('/api/object-types', async ({ request, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()
    return withDelay(() => HttpResponse.json(mockObjectTypes))
  }),

  http.get('/api/work-types', async ({ request, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()
    return withDelay(() => HttpResponse.json(mockWorkTypes))
  }),

  http.get('/api/counterparties', async ({ request, cookies }) => {
    if (!sessionUser(request, cookies)) return unauthorized()
    return withDelay(() => HttpResponse.json(mockCounterparties))
  }),

  // === RESET (для тестов) ===
  http.post('/api/__mocks__/reset', async () => {
    return withDelay(() => {
      resetMockObjects()
      resetMockPackages()
      return HttpResponse.json({ ok: true })
    })
  }),
]
