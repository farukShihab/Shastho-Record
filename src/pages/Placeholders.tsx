import { useAuth } from '../auth/AuthContext'

// Shown inside the app shell for screens we haven't built yet.
export function ComingSoon({ title, step }: { title: string; step: number }) {
  return (
    <div className="rounded-xl bg-white p-6 text-center shadow-sm">
      <h1 className="text-lg font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-gray-700">Coming in step {step}.</p>
    </div>
  )
}

// Accounts whose role this app has no screens for (e.g. the Django superuser).
export function Unsupported() {
  const { user, logout } = useAuth()
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Account not supported</h1>
      <p className="my-3 text-gray-600">
        This app is for patients and doctors. The account “{user?.username}” has
        the role “{String(user?.role)}”, which has no screens here. Use the Django admin for it.
      </p>
      <button onClick={logout} className="rounded border px-3 py-1">Log out</button>
    </div>
  )
}