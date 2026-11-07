import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { Role } from '../types'
import OfflineBanner from './OfflineBanner'

interface NavItem {
  to: string
  label: string
  end?: boolean // `end` stops "/patient" from also highlighting on "/patient/upload"
}

// The nav is decided by role. This is UI only; the backend still enforces permissions.
const NAV: Record<Role, NavItem[]> = {
  patient: [
    { to: '/patient', label: 'Timeline', end: true },
    { to: '/patient/upload', label: 'Upload' },
    { to: '/patient/access', label: 'Access' },
  ],
  doctor: [{ to: '/doctor', label: 'Patients' }],
}

export default function AppShell() {
  const { user, logout } = useAuth()
  if (!user || (user.role !== 'patient' && user.role !== 'doctor')) return null

  const items = NAV[user.role]
  const fullName = `${user.first_name} ${user.last_name}`.trim() || user.username
  const subtitle =
    user.role === 'patient'
      ? `Patient · ${user.patient_code ?? ''}`
      : `Doctor · ${[user.specialty, user.clinic_name].filter(Boolean).join(', ')}`

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-teal-900">{fullName}</p>
            <p className="truncate text-xs text-gray-700">{subtitle}</p>
          </div>
          <button
            onClick={logout}
            className="ml-3 shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
          >
            Log out
          </button>
        </div>
      </header>
      <OfflineBanner />

      {/* pb-24 keeps content from hiding behind the fixed bottom nav */}
      <main className="mx-auto max-w-2xl px-4 py-4 pb-24">
        <Outlet />
      </main>

      {/* Only show the bottom nav when there is something to switch between. */}
      {items.length > 1 && (
        <nav className="fixed inset-x-0 bottom-0 border-t bg-white pb-[env(safe-area-inset-bottom)]">
          <ul className="mx-auto flex max-w-2xl">
            {items.map((item) => (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `block py-3 text-center text-sm font-medium ${
                      isActive ? 'text-teal-800' : 'text-gray-700'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}