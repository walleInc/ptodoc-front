import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button } from '@/shared'
import logo from '@/assets/logo-pto-doc.jpg'
import { LANDING_DEMO_NAV_LINK, LANDING_NAV_LINKS } from '../model/content'
import { isPublicDemoEnabled } from '../model/demoFlags'

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = isPublicDemoEnabled()
    ? [LANDING_NAV_LINKS[0]!, LANDING_DEMO_NAV_LINK, ...LANDING_NAV_LINKS.slice(1)]
    : LANDING_NAV_LINKS

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /** Логотип всегда возвращает на начало главной страницы с плавной прокруткой. */
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setMobileOpen(false)
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <header
      className={
        scrolled
          ? 'fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm transition-all duration-300'
          : 'fixed inset-x-0 top-0 z-50 bg-transparent transition-all duration-300'
      }
    >
      <div className="container-main flex h-16 items-center justify-between">
        <Link
          to="/"
          onClick={handleLogoClick}
          className="flex cursor-pointer items-center gap-2"
          aria-label="ПТО-Doc, на главную"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm">
            <img src={logo} alt="" className="h-full w-full object-contain object-left" />
          </span>
          <span
            className={
              scrolled
                ? 'text-xl font-bold text-primary-600'
                : 'text-xl font-bold text-white'
            }
          >
            ПТО-Doc
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => {
            const className = scrolled
              ? 'text-sm font-medium text-gray-600 hover:text-primary-700 transition-colors'
              : 'text-sm font-medium text-white/80 hover:text-white transition-colors'
            if (link.href.startsWith('#')) {
              return (
                <a key={link.href} href={link.href} className={className}>
                  {link.label}
                </a>
              )
            }
            return (
              <Link key={link.href} to={link.href} className={className}>
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden md:block">
          <Button asChild>
            <Link to="/login">Войти</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
          className={
            scrolled
              ? 'md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100'
              : 'md:hidden p-2 rounded-md text-white hover:bg-white/10'
          }
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow-lg">
          <nav className="container-main flex flex-col gap-1 py-4">
            {links.map((link) => {
              const className =
                'px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-700'
              if (link.href.startsWith('#')) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={className}
                  >
                    {link.label}
                  </a>
                )
              }
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={className}
                >
                  {link.label}
                </Link>
              )
            })}
            <Button asChild className="mt-2">
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                Войти
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
