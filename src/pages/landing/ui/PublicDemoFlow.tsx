import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileCheck2, Sparkles, Upload } from 'lucide-react'
import { ALLOWED_MIME_TYPES } from '@/entities/package'
import { UploadDropzone, UploadFileList, type UploadItem } from '@/features/upload'
import { Alert, AlertDescription, Button, Card, CardContent } from '@/shared'
import { runPublicDemoCheck, type DemoCheckResult } from '../model/demoApi'
import { hasUsedPublicDemo, markPublicDemoUsed } from '../model/demoSession'
import { DemoLeadModal } from './DemoLeadModal'
import { DemoPackageWorkspace } from './DemoPackageWorkspace'

const DEMO_MAX_FILES = 5

type Phase = 'upload' | 'processing' | 'result'

const PHASE_LABEL = {
  idle: '',
  preparing: 'Подготовка пакета…',
  uploading: 'Загрузка файлов…',
  starting: 'Запуск обработки…',
} as const

type BusyPhase = keyof typeof PHASE_LABEL

/** Зелёная подложка на всю высоту экрана (под хедером) с мягкими декоративными пятнами. */
const GREEN_SCREEN_BG = 'relative overflow-hidden bg-gradient-to-b from-primary-50 via-primary-50 to-primary-100'

function GreenScreenDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -top-24 -left-32 h-96 w-96 rounded-full bg-primary-200/50 blur-3xl" />
      <div className="absolute top-1/3 -right-24 h-[26rem] w-[26rem] rounded-full bg-primary-300/30 blur-3xl" />
      <div className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-primary-200/40 blur-3xl" />
    </div>
  )
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isAllowed(file: File): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)
}

/** Публичное демо: UX как UploadPage → PackagePage. */
export function PublicDemoFlow() {
  const [files, setFiles] = useState<File[]>([])
  const [phase, setPhase] = useState<Phase>('upload')
  const [busyLabel, setBusyLabel] = useState<BusyPhase>('idle')
  const [progress, setProgress] = useState<number | undefined>()
  const [result, setResult] = useState<DemoCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rejected, setRejected] = useState<string[]>([])
  const [leadOpen, setLeadOpen] = useState(false)
  const [used, setUsed] = useState(() => hasUsedPublicDemo())

  const items: UploadItem[] = useMemo(
    () =>
      files.map((file, index) => ({
        id: `demo-${file.name}-${file.size}-${index}`,
        file,
        status: 'queued' as const,
        progress: 0,
      })),
    [files]
  )

  const openLead = () => setLeadOpen(true)
  const busy = busyLabel !== 'idle'

  const addFiles = (incoming: File[]) => {
    if (busy || phase !== 'upload' || used) return
    setError(null)
    const next = [...files]
    const fails: string[] = []
    for (const file of incoming) {
      if (next.length >= DEMO_MAX_FILES) {
        fails.push(`Не больше ${DEMO_MAX_FILES} файлов в демо`)
        break
      }
      if (!isAllowed(file)) {
        fails.push(`«${file.name}»: формат не поддерживается (PDF, DOCX, XLSX, CSV)`)
        continue
      }
      if (next.some((f) => f.name === file.name && f.size === file.size)) continue
      next.push(file)
    }
    setFiles(next)
    setRejected(fails)
  }

  const removeAt = (id: string) => {
    if (busy) return
    const index = items.findIndex((i) => i.id === id)
    if (index < 0) return
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setError(null)
    if (hasUsedPublicDemo() || used) {
      openLead()
      return
    }
    if (files.length === 0) {
      setError('Добавьте хотя бы один файл')
      return
    }

    setBusyLabel('preparing')
    await sleep(400)
    setBusyLabel('uploading')
    await sleep(500)
    setBusyLabel('starting')

    const apiPromise = runPublicDemoCheck(files)
    setPhase('processing')
    setProgress(12)
    setBusyLabel('idle')

    const tick = window.setInterval(() => {
      setProgress((p) => {
        if (p === undefined || p >= 90) return p
        return p + 8
      })
    }, 280)

    const checkResult = await apiPromise
    window.clearInterval(tick)
    setProgress(100)
    await sleep(350)
    setResult(checkResult)
    markPublicDemoUsed()
    setUsed(true)
    setProgress(undefined)
    setPhase('result')
  }

  if (phase === 'processing' || (phase === 'result' && result)) {
    return (
      <div className="mx-auto w-full max-w-[110rem] space-y-4 px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <DemoPackageWorkspace
          files={files}
          result={result ?? { findings: [], disclaimer: '', mock: true }}
          progress={phase === 'processing' ? progress : undefined}
          onLead={openLead}
        />
        <DemoLeadModal open={leadOpen} onOpenChange={setLeadOpen} />
      </div>
    )
  }

  if (used) {
    return (
      <section className={`flex flex-1 items-center justify-center px-4 py-12 sm:py-16 ${GREEN_SCREEN_BG}`}>
        <GreenScreenDecor />

        <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md shadow-primary-200/60 ring-1 ring-primary-200">
            <FileCheck2 className="h-8 w-8 text-primary-600" />
          </span>

          <p className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary-700">
            <Sparkles className="h-3.5 w-3.5" />
            Демо исчерпано
          </p>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-primary-950 sm:text-3xl lg:text-4xl">
            Бесплатная проверка в этом браузере уже использована
          </h1>

          <p className="mt-4 max-w-lg text-base leading-relaxed text-primary-900/80">
            Один бесплатный прогон доступен один раз. Оставьте заявку — подключим кабинет и полный объём проверок по
            объекту.
          </p>

          <div className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:justify-center">
            <Button size="lg" className="h-12 w-full px-8 text-base sm:w-auto" onClick={openLead}>
              Оставить заявку
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 w-full border-primary-300 bg-white px-8 text-base text-primary-800 hover:bg-primary-100 hover:text-primary-950 sm:w-auto"
            >
              <Link to="/">
                <ArrowLeft className="mr-2 h-5 w-5" />
                На главную
              </Link>
            </Button>
          </div>
        </div>

        <DemoLeadModal open={leadOpen} onOpenChange={setLeadOpen} />
      </section>
    )
  }

  return (
    <section className={`flex flex-1 items-center justify-center px-4 py-8 sm:py-12 ${GREEN_SCREEN_BG}`}>
      <GreenScreenDecor />

      <div className="relative z-10 w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-primary-950 sm:text-3xl">Загрузка документов</h1>
          <p className="mt-2 text-sm text-primary-800/90">
            Демо · без регистрации · один бесплатный прогон
          </p>
        </div>

        <Card className="rounded-2xl border-primary-100 shadow-xl shadow-primary-200/40">
          <CardContent className="space-y-5 p-5 sm:p-7">
            <UploadDropzone
              onFiles={addFiles}
              disabled={busy}
              hint="PDF, DOCX, XLSX, CSV · не больше 5 файлов · сканы не поддерживаются"
              className="rounded-xl px-6 py-12 sm:py-14 [&>svg]:h-12 [&>svg]:w-12"
            />

            {rejected.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {rejected.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {items.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-xl border border-primary-100 bg-white">
                <UploadFileList items={items} onRemove={busy ? undefined : removeAt} />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-primary-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-sm text-primary-900/70 sm:text-left">
                {busy ? PHASE_LABEL[busyLabel] : `Файлов: ${items.length} из ${DEMO_MAX_FILES}`}
              </p>
              <Button
                size="lg"
                className="h-12 w-full px-8 text-base sm:w-auto"
                onClick={handleSubmit}
                disabled={items.length === 0 || busy}
                loading={busy}
              >
                <Upload className="mr-2 h-5 w-5" />
                Загрузить и проверить
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <DemoLeadModal open={leadOpen} onOpenChange={setLeadOpen} />
    </section>
  )
}
