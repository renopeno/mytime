import { lazy, Suspense } from 'react'
import { Navigate, Outlet, createBrowserRouter, RouterProvider } from 'react-router'
import { Loader2 } from 'lucide-react'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'

const TimeEntriesPage = lazy(() => import('@/pages/TimeEntriesPage'))
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'))
const ClientsPage = lazy(() => import('@/pages/ClientsPage'))
const InvoicingPage = lazy(() => import('@/pages/InvoicingPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
      </div>
    </div>
  )
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/time-entries" replace /> },
          { path: 'time-entries', element: <SuspenseWrapper><TimeEntriesPage /></SuspenseWrapper> },
          { path: 'projects', element: <SuspenseWrapper><ProjectsPage /></SuspenseWrapper> },
          { path: 'clients', element: <SuspenseWrapper><ClientsPage /></SuspenseWrapper> },
          { path: 'invoicing', element: <SuspenseWrapper><InvoicingPage /></SuspenseWrapper> },
          { path: 'dashboard', element: <Navigate to="/reports" replace /> },
          { path: 'reports', element: <SuspenseWrapper><ReportsPage /></SuspenseWrapper> },
          { path: 'settings', element: <SuspenseWrapper><SettingsPage /></SuspenseWrapper> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
])

export default function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster />
      </TooltipProvider>
    </AuthProvider>
  )
}
