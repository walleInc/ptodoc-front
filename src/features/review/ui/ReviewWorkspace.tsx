import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

const DEFAULT_LEFT = 210
const DEFAULT_RIGHT = 290

export interface ReviewWorkspaceProps {
  left: ReactNode
  center: ReactNode
  right: ReactNode
  className?: string
  /** px; used by later resize/persist commits */
  leftWidth?: number
  rightWidth?: number
}

/** Единый 3-колоночный shell проверки (список | превью | замечания). */
export function ReviewWorkspace({
  left,
  center,
  right,
  className,
  leftWidth = DEFAULT_LEFT,
  rightWidth = DEFAULT_RIGHT,
}: ReviewWorkspaceProps) {
  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full overflow-hidden rounded-lg border border-gray-200 bg-white',
        className
      )}
    >
      <aside
        className="flex min-h-0 shrink-0 flex-col border-r border-gray-200 bg-gray-50"
        style={{ width: leftWidth }}
      >
        {left}
      </aside>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">{center}</section>
      <aside
        className="flex min-h-0 shrink-0 flex-col border-l border-gray-200 bg-white"
        style={{ width: rightWidth }}
      >
        {right}
      </aside>
    </div>
  )
}
