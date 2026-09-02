
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type ProtectedRouteProps = {
  allowedRoles?: ('admin' | 'staff' | 'komite')[]
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, profile, isLoading } = useAuth()

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Redirect to their default dashboard if they try to access unauthorized role routes
    return <Navigate to={profile.role === 'admin' ? '/admin' : profile.role === 'komite' ? '/komite' : '/staff'} replace />
  }

  return <Outlet />
}
