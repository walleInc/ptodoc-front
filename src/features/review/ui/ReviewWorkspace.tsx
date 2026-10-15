import { useCallback, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

const DEFAULT_LEFT = 210
const DEFAULT_RIGHT = 290
const MIN_PANE = 160

export interface ReviewWorkspaceProps {
  left: ReactNode
  center: ReactNode
  right: ReactNode
  className?: string
  leftWidth?: number
  rightWidth?: number
}

function ResizeGutter({
  onDragStart,
  onDrag,
}: {
  onDragStart: () => void
  onDrag: (dx: number) => void
}) {
  const originX = useRef(0)

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    originX.current = e.clientX
    onDragStart()
    const move = (ev: MouseEvent) => onDrag(ev.clientX - originX.current)
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      tabIndex={0}
      className="w-1 shrink-0 cursor-col-resize bg-gray-200 hover:bg-primary-500 active:bg-primary-600"
      onMouseDown={onMouseDown}
    />
  )
}

/** Единый 3-колоночный shell проверки с drag-разделителями. */
export function ReviewWorkspace({
  left,
  center,
  right,
  className,
  leftWidth: leftProp = DEFAULT_LEFT,
  rightWidth: rightProp = DEFAULT_RIGHT,
}: ReviewWorkspaceProps) {
  const [leftWidth, setLeftWidth] = useState(leftProp)
  const [rightWidth, setRightWidth] = useState(rightProp)
  const leftOrigin = useRef(leftWidth)
  const rightOrigin = useRef(rightWidth)

  const startLeft = useCallback(() => {
    leftOrigin.current = leftWidth
  }, [leftWidth])

  const startRight = useCallback(() => {
    rightOrigin.current = rightWidth
  }, [rightWidth])

  const dragLeft = useCallback((dx: number) => {
    setLeftWidth(Math.max(MIN_PANE, leftOrigin.current + dx))
  }, [])

  const dragRight = useCallback((dx: number) => {
    setRightWidth(Math.max(MIN_PANE, rightOrigin.current - dx))
  }, [])

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full overflow-hidden rounded-lg border border-gray-200 bg-white',
        className
      )}
    >
      <aside className="flex min-h-0 shrink-0 flex-col bg-gray-50" style={{ width: leftWidth }}>
        {left}
      </aside>
      <ResizeGutter onDragStart={startLeft} onDrag={dragLeft} />
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">{center}</section>
      <ResizeGutter onDragStart={startRight} onDrag={dragRight} />
      <aside className="flex min-h-0 shrink-0 flex-col bg-white" style={{ width: rightWidth }}>
        {right}
      </aside>
    </div>
  )
}
