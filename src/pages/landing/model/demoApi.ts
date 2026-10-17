export type DemoFinding = {
  id: string
  title: string
  page?: number
  quote?: string
  severity?: 'info' | 'warning' | 'error'
}

export type DemoCheckResult = {
  findings: DemoFinding[]
  reportUrl?: string
  disclaimer: string
  /** true — ответ сгенерирован на клиенте (API недоступен) */
  mock: boolean
}

export type DemoLeadPayload = {
  email: string
  company: string
  phone: string
  comment: string
}

const DEFAULT_DISCLAIMER =
  'Это пример интерфейса. Чтобы проверить свои документы в кабинете — оставьте заявку.'

function apiBase(): string {
  const raw = import.meta.env.VITE_API_URL || '/api'
  return raw.replace(/\/$/, '')
}

/** Заготовка вызова бэка. При ошибке/отсутствии API — UI-заглушка результата. */
export async function runPublicDemoCheck(files: File[]): Promise<DemoCheckResult> {
  const form = new FormData()
  files.forEach((file) => form.append('files', file))

  try {
    const response = await fetch(`${apiBase()}/public/demo/check`, {
      method: 'POST',
      body: form,
      credentials: 'omit',
    })
    if (!response.ok) throw new Error(`demo check ${response.status}`)
    const data = (await response.json()) as Partial<DemoCheckResult>
    return {
      findings: data.findings ?? [],
      reportUrl: data.reportUrl,
      disclaimer: data.disclaimer ?? DEFAULT_DISCLAIMER,
      mock: false,
    }
  } catch {
    return {
      mock: true,
      disclaimer: DEFAULT_DISCLAIMER,
      findings: [
        {
          id: 'mock-1',
          title: 'Дата АОСР позже записи в журнале работ',
          page: 2,
          quote: 'Пример замечания для демонстрации интерфейса.',
          severity: 'warning',
        },
        {
          id: 'mock-2',
          title: 'Не заполнены обязательные поля подписи',
          page: 1,
          quote: 'В полном кабинете здесь появятся живые замечания по вашим документам.',
          severity: 'error',
        },
      ],
    }
  }
}

/** Отправка заявки на демо/подключение. При ошибке сети или не-OK ответе — бросает. */
export async function submitPublicDemoLead(payload: DemoLeadPayload): Promise<{ ok: boolean }> {
  const response = await fetch(`${apiBase()}/public/demo/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'omit',
  })
  if (!response.ok) throw new Error(`demo lead ${response.status}`)
  return { ok: true }
}

export type ContactLeadPayload = {
  name: string
  email: string
  message: string
}

/** Заявка из футера лендинга. При ошибке сети или не-OK ответе — бросает. */
export async function submitContactLead(payload: ContactLeadPayload): Promise<{ ok: boolean }> {
  const response = await fetch(`${apiBase()}/public/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'omit',
  })
  if (!response.ok) throw new Error(`contact lead ${response.status}`)
  return { ok: true }
}
