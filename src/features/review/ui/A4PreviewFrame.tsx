import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

interface A4PreviewFrameProps {
  children: ReactNode
  className?: string
}

/** Серый стол + лист A4 (210×297) по центру для превью документа. */
export function A4PreviewFrame({ children, className }: A4PreviewFrameProps) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-gray-200', className)}>
      <div className="flex min-h-0 flex-1 justify-center overflow-auto p-3 sm:p-4">
        <div
          className="flex h-full max-h-full w-full max-w-[min(100%,480px)] flex-col bg-white shadow-lg"
          style={{ aspectRatio: '210 / 297' }}
        >
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  )
}
