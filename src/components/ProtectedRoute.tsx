import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <p className="text-sm text-muted">Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
