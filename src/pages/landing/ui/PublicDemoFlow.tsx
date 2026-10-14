import { useEffect, useMemo, useState } from 'react'
import { Upload } from 'lucide-react'
import { ALLOWED_MIME_TYPES } from '@/entities/package'
import { UploadDropzone, UploadFileList, type UploadItem } from '@/features/upload'
import { Alert, AlertDescription, Button, Card, CardContent, CardHeader } from '@/shared'
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
  const [used, setUsed] = useState(false)

  useEffect(() => {
    setUsed(hasUsedPublicDemo())
  }, [])

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
      <div className="space-y-4">
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {used ? (
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wide text-primary-700">Демо исчерпано</p>
          <h1 className="mt-2 text-xl font-bold text-primary-950 sm:text-2xl">
            Бесплатная проверка в этом браузере уже использована
          </h1>
          <p className="mt-2 max-w-lg text-sm text-primary-900/80">
            Оставьте заявку — подключим кабинет и полный объём проверок по объекту.
          </p>
          <Button type="button" className="mt-5" onClick={openLead}>
            Оставить заявку
          </Button>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Загрузка документов</h1>
            <p className="text-sm text-gray-500">Демо · без регистрации</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <UploadDropzone onFiles={addFiles} disabled={busy} />

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

            {items.length > 0 && <UploadFileList items={items} onRemove={busy ? undefined : removeAt} />}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                {busy ? PHASE_LABEL[busyLabel] : `Файлов: ${items.length}`}
              </p>
              <Button onClick={handleSubmit} disabled={items.length === 0 || busy} loading={busy}>
                <Upload className="h-4 w-4 mr-2" />
                Загрузить и проверить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <DemoLeadModal open={leadOpen} onOpenChange={setLeadOpen} />
    </div>
  )
}
