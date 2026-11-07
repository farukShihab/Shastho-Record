import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { homeFor } from '../lib/roles'
import type { Role } from '../types'

// Usage: <Route element={<ProtectedRoute role="patient" />}> ...child routes... </Route>
// This only controls what the UI shows. The backend still enforces every permission.
export default function ProtectedRoute({ role }: { role?: Role }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="p-6 text-center text-gray-500">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={homeFor(user.role)} replace />

  return <Outlet />
}