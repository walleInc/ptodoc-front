import { useCallback, useEffect } from 'react'
import { SpecialZoomLevel, Viewer, Worker, type RenderPageProps } from '@react-pdf-viewer/core'
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url'
import '@react-pdf-viewer/core/lib/styles/index.css'

export interface PdfHighlight {
  id: string
  /** Номер страницы с 1 */
  page: number
  /** [x0, y0, x1, y1] в долях страницы от левого верхнего угла */
  bbox: [number, number, number, number]
  color: string
}

interface PdfViewerProps {
  fileUrl: string
  /** Номер страницы с 1: прокрутка при смене (выбор замечания) */
  page?: number
  highlights?: PdfHighlight[]
  activeHighlightId?: string
}

export function PdfViewer({ fileUrl, page, highlights = [], activeHighlightId }: PdfViewerProps) {
  // pageNavigationPlugin() вызывает хуки внутри — только на верхнем уровне каждый рендер
  const navigation = pageNavigationPlugin()
  const { jumpToPage } = navigation

  useEffect(() => {
    if (!page) return
    try {
      jumpToPage(page - 1)
    } catch {
      // документ ещё не загружен — страницу откроет initialPage
    }
  }, [page, activeHighlightId, jumpToPage])

  const renderPage = useCallback(
    (props: RenderPageProps) => (
      <>
        {props.canvasLayer.children}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {highlights
            .filter((h) => h.page - 1 === props.pageIndex)
            .map((h) => (
              <div
                key={h.id}
                data-testid="pdf-highlight"
                style={{
                  position: 'absolute',
                  left: `${h.bbox[0] * 100}%`,
                  top: `${h.bbox[1] * 100}%`,
                  width: `${(h.bbox[2] - h.bbox[0]) * 100}%`,
                  height: `${(h.bbox[3] - h.bbox[1]) * 100}%`,
                  background: h.color,
                  outline: h.id === activeHighlightId ? '2px solid #111827' : 'none',
                  borderRadius: 2,
                }}
              />
            ))}
        </div>
        {props.annotationLayer.children}
        {props.textLayer.children}
      </>
    ),
    [highlights, activeHighlightId]
  )

  return (
    <div className="h-full w-full min-h-0 overflow-hidden [&_.rpv-core__viewer]:h-full [&_.rpv-core__inner-pages]:overflow-x-hidden">
      <Worker workerUrl={workerUrl}>
        <Viewer
          key={fileUrl}
          fileUrl={fileUrl}
          defaultScale={SpecialZoomLevel.PageWidth}
          initialPage={page ? page - 1 : 0}
          plugins={[navigation]}
          renderPage={renderPage}
        />
      </Worker>
    </div>
  )
}
