import { LayoutDashboard, FolderKanban, User as UserIcon, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth'
import { Button, Tooltip, TooltipContent, TooltipTrigger, cn } from '@/shared'
import logo from '@/assets/logo-pto-doc.jpg'

const navigation = [
  { name: 'Обзор', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Объекты', href: '/objects', icon: FolderKanban },
  { name: 'Профиль', href: '/profile', icon: UserIcon },
]

interface SidebarProps {
  collapsed?: boolean
  /** true — рендер внутри мобильного Sheet (относительное позиционирование вместо fixed) */
  embedded?: boolean
  /** Колбэк переключения сворачивания (кнопка рядом с логотипом) */
  onToggle?: () => void
}

export function Sidebar({ collapsed = false, embedded = false, onToggle }: SidebarProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const navigate = useNavigate()
  const location = useLocation()

  if (!isAuthenticated) return null

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <aside
      className={cn(
        'inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-[width] duration-300 overflow-hidden',
        embedded ? 'relative h-full flex' : 'fixed hidden lg:flex',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Шапка только на desktop: в mobile Sheet логотип уже в Layout */}
      {!embedded && (
        <div
          className={cn(
            'relative flex-shrink-0 border-b border-gray-200',
            collapsed
              ? 'flex flex-col items-center gap-1 pl-0 pr-2 py-2'
              : 'flex h-16 items-center pr-3'
          )}
        >
          <Link
            to="/dashboard"
            aria-label="На главную"
            className={cn(
              'flex items-center shrink-0',
              collapsed ? 'justify-center' : 'absolute left-0 top-0 h-16 w-16'
            )}
          >
            <span
              className={cn(
                'flex shrink-0 items-center justify-center overflow-hidden bg-white',
                collapsed ? 'h-14 w-14' : 'h-16 w-16'
              )}
            >
              <img
                src={logo}
                alt=""
                className="h-full w-full scale-150 object-cover object-left"
              />
            </span>
          </Link>
          {!collapsed && (
            <>
              <span className="ml-16 text-xl font-bold leading-none text-primary-600">ПТО-Doc</span>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-gray-500 hover:text-gray-900"
                onClick={onToggle}
                aria-label="Свернуть сайдбар"
              >
                <ToggleIcon className="h-5 w-5" />
              </Button>
            </>
          )}
          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-gray-500 hover:text-gray-900"
              onClick={onToggle}
              aria-label="Развернуть сайдбар"
            >
              <ToggleIcon className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}
      <nav className={cn('flex-1 py-4 space-y-1 overflow-y-auto scrollbar-thin', collapsed ? 'px-2.5' : 'px-3')}>
        {navigation.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
          const button = (
            <Button
              key={item.name}
              variant="ghost"
              aria-label={item.name}
              className={cn(
                'w-full justify-start gap-3',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-primary-50 text-primary-700 hover:bg-primary-100 hover:text-primary-800'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
              onClick={() => navigate(item.href)}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {!collapsed && <span>{item.name}</span>}
            </Button>
          )

          if (!collapsed) return button

          return (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="right">{item.name}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>
    </aside>
  )
}
