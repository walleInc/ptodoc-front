import { useDropzone } from 'react-dropzone'
import { UploadCloud } from 'lucide-react'
import { cn } from '@/shared'

interface UploadDropzoneProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
  /** MIME / extensions for input accept, e.g. ".pdf,application/pdf" */
  accept?: string
  hint?: string
  /** Дополнительные классы контейнера (например, увеличенные отступы в демо) */
  className?: string
}

const DEFAULT_ACCEPT = '.pdf,.docx,.xlsx,.csv'
const DEFAULT_HINT = 'PDF, DOCX, XLSX, CSV · до 200 файлов в пакете · сканы не поддерживаются'

export function UploadDropzone({
  onFiles,
  disabled,
  accept = DEFAULT_ACCEPT,
  hint = DEFAULT_HINT,
  className,
}: UploadDropzoneProps) {
  // Формат проверяем сами в useUploadQueue, чтобы показать причину отказа по каждому файлу
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted, rejections) => onFiles([...accepted, ...rejections.map((r) => r.file)]),
    disabled,
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer',
        isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-white hover:bg-gray-50',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      <input {...getInputProps({ accept })} />
      <UploadCloud className="h-10 w-10 text-gray-400" />
      <p className="text-sm font-medium text-gray-900">
        {isDragActive ? 'Отпустите файлы здесь' : 'Перетащите файлы или нажмите для выбора'}
      </p>
      <p className="text-xs text-gray-500">{hint}</p>
    </div>
  )
}
