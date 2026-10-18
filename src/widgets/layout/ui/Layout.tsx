import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { Sheet, SheetContent, Button, cn } from '@/shared'
import { Sidebar } from '@/widgets/sidebar'
import { Header } from '@/widgets/header'
import logo from '@/assets/logo-pto-doc.jpg'

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const isPackageReview = /\/objects\/[^/]+\/packages\/[^/]+/.test(location.pathname)

  // Закрывать мобильное меню при смене маршрута
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="h-dvh overflow-hidden bg-gray-50">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((prev) => !prev)} />
      <div
        className={
          sidebarCollapsed
            ? 'lg:pl-20 flex h-dvh flex-col overflow-hidden min-w-0 transition-[padding] duration-300'
            : 'lg:pl-64 flex h-dvh flex-col overflow-hidden min-w-0 transition-[padding] duration-300'
        }
      >
        <div className="shrink-0">
          <Header onMenuClick={() => setMobileOpen(true)} />
        </div>
        <main
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col',
            isPackageReview ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 sm:p-6 lg:p-8'
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Мобильный сайдбар (оверлей, только < lg) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" hideClose className="w-[min(100%,16rem)] p-0 sm:w-64">
          <div className="flex h-14 items-center justify-between border-b border-gray-200 pr-3 sm:h-16 sm:pr-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden bg-white sm:h-16 sm:w-16">
                <img src={logo} alt="" className="h-full w-full object-contain object-left" />
              </span>
              <span className="truncate text-lg font-bold text-primary-600 sm:text-xl">ПТО-Doc</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Закрыть меню">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="h-[calc(100%-3.5rem)] sm:h-[calc(100%-4rem)]">
            <Sidebar embedded collapsed={false} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
