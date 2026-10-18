import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

interface A4PreviewFrameProps {
  children: ReactNode
  className?: string
}

/** Серый стол + превью на всю высоту центра (без padding, который раздувает layout). */
export function A4PreviewFrame({ children, className }: A4PreviewFrameProps) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden bg-gray-200', className)}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white ring-1 ring-inset ring-black/5">
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
