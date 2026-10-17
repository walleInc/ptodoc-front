import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TooltipProvider } from '@/shared'
import { Layout } from '@/widgets'
import { useAuthStore } from '@/features/auth'
import { ProtectedRoute } from './ProtectedRoute'
import { OwnerRoute } from './OwnerRoute'
import { LoginPage } from '@/pages/login'
import { DashboardPage } from '@/pages/dashboard'
import { ObjectsPage } from '@/pages/objects'
import { ObjectDetailPage } from '@/pages/object-detail'
import { ObjectEditPage } from '@/pages/object-edit'
import { ObjectCreatePage } from '@/pages/object-new'
import { UploadPage } from '@/pages/upload'
import { PackagePage } from '@/pages/package'
import { ProfilePage } from '@/pages/profile'
import { LandingPage, DemoPage } from '@/pages/landing'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 минут
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Корень сайта: неавторизованным — лендинг, авторизованным — сразу кабинет.
 * Важно: индексный маршрут внутри защищённой группы убран, иначе он перебивает
 * этот маршрут по рангу react-router и «/» всегда редиректил в кабинет.
 */
function LandingRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <LandingPage />
}

export function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingRoute />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/objects" element={<ObjectsPage />} />
              <Route
                path="/objects/new"
                element={
                  <OwnerRoute>
                    <ObjectCreatePage />
                  </OwnerRoute>
                }
              />
              <Route path="/objects/:id" element={<ObjectDetailPage />} />
              <Route
                path="/objects/:id/edit"
                element={
                  <OwnerRoute>
                    <ObjectEditPage />
                  </OwnerRoute>
                }
              />
              <Route path="/objects/:id/upload" element={<UploadPage />} />
              <Route path="/objects/:id/packages/:packageId" element={<PackagePage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
