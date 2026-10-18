import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

interface A4PreviewFrameProps {
  children: ReactNode
  className?: string
}

/** Серый стол + область превью под реальный размер страницы PDF (без жёсткого A4-бокса). */
export function A4PreviewFrame({ children, className }: A4PreviewFrameProps) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-gray-200', className)}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white shadow-lg">
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  )
}
