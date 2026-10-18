import { Link, Navigate } from 'react-router-dom'
import logo from '@/assets/logo-pto-doc.jpg'
import { isPublicDemoEnabled } from '../model/demoFlags'
import { PublicDemoFlow } from './PublicDemoFlow'

/** Публичная страница демо-проверки (UX как кабинет: upload → package workspace). */
export function DemoPage() {
  if (!isPublicDemoEnabled()) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gray-50 text-gray-900">
      <header className="z-40 shrink-0 border-b border-gray-200 bg-white">
        <div className="flex h-16 w-full items-center">
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="ПТО-Doc, на главную">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm">
              <img src={logo} alt="" className="h-full w-full object-contain object-left" />
            </span>
            <span className="text-xl font-bold text-primary-600">ПТО-Doc</span>
          </Link>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PublicDemoFlow />
      </main>
    </div>
  )
}
