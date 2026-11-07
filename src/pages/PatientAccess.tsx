import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, apiJson } from '../lib/api'
import { formatDate } from '../lib/format'
import type { AccessGrant, DoctorSummary } from '../types'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; doctors: DoctorSummary[]; grants: AccessGrant[] }

// DRF errors come in several shapes ({"detail": "..."}, {"doctor": ["..."]},
// a bare list). Flatten whatever we get into plain strings.
function flatten(data: unknown): string[] {
  if (typeof data === 'string') return [data]
  if (Array.isArray(data)) return data.flatMap(flatten)
  if (data && typeof data === 'object') return Object.values(data).flatMap(flatten)
  return []
}

function describe(err: unknown): string {
  if (err instanceof ApiError) {
    const lines = flatten(err.data)
    if (err.status === 400 && lines.length > 0) return lines.join(' ')
    if (err.status === 403) return 'Only patients can manage access.'
    if (err.status === 404) return 'That access entry no longer exists.'
    return `The server returned an error (${err.status}).`
  }
  return 'Could not reach the server. Check your connection and try again.'
}

function doctorLine(d: { specialty: string | null; clinic_name: string | null }): string {
  return [d.specialty, d.clinic_name].filter(Boolean).join(' · ')
}

export default function PatientAccess() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [selected, setSelected] = useState('')
  const [granting, setGranting] = useState(false)
  const [revokingId, setRevokingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let active = true
    // Both requests are independent, so run them in parallel.
    Promise.all([
      apiJson<DoctorSummary[]>('/api/doctors/'),
      apiJson<AccessGrant[]>('/api/access/'),
    ])
      .then(([doctors, grants]) => active && setState({ status: 'ready', doctors, grants }))
      .catch((err) => active && setState({ status: 'error', message: describe(err) }))
    return () => {
      active = false
    }
  }, [reloadKey])

  // After a grant or revoke we refetch only the grants and update them in place,
  // so the screen doesn't flash back to the loading skeleton.
  async function refreshGrants() {
    const grants = await apiJson<AccessGrant[]>('/api/access/')
    setState((prev) => (prev.status === 'ready' ? { ...prev, grants } : prev))
  }

  async function onGrant(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    setActionError('')
    setGranting(true)
    try {
      await apiJson<unknown>('/api/access/', {
        method: 'POST',
        body: JSON.stringify({ doctor: Number(selected) }),
      })
      setSelected('')
      await refreshGrants()
    } catch (err) {
      setActionError(describe(err))
    } finally {
      setGranting(false)
    }
  }

  async function onRevoke(grant: AccessGrant) {
    if (!window.confirm(`Revoke ${grant.doctor_name}'s access to your records?`)) return
    setActionError('')
    setRevokingId(grant.id)
    try {
      await apiJson<unknown>(`/api/access/${grant.id}/revoke/`, { method: 'POST' })
      await refreshGrants()
    } catch (err) {
      setActionError(describe(err))
    } finally {
      setRevokingId(null)
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading access settings">
        {[0, 1].map((i) => (
          <div key={i} className="animate-pulse rounded-xl bg-white p-4 shadow-sm">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="mt-3 h-10 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div role="alert" className="rounded-xl bg-red-50 p-5 text-center">
        <p className="text-red-900">{state.message}</p>
        <button
          onClick={() => {
            setState({ status: 'loading' })
            setReloadKey((k) => k + 1)
          }}
          className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100"
        >
          Try again
        </button>
      </div>
    )
  }

  const { doctors, grants } = state
  const active = grants.filter((g) => g.is_active)
  const past = grants.filter((g) => !g.is_active)
  // The server rejects a second active grant to the same doctor (400), so we
  // simply don't offer those doctors. The error handling above still covers a
  // race, such as granting from two browser tabs.
  const activeDoctorIds = new Set(active.map((g) => g.doctor))
  const available = doctors.filter((d) => !activeDoctorIds.has(d.id))

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-teal-900">Doctor access</h1>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-gray-900">Give a doctor access</h2>
        <p className="mt-1 text-sm text-gray-800">
          A doctor you choose can view your timeline and verify your records.
        </p>

        {available.length === 0 ? (
          <p className="mt-3 text-sm text-gray-800">
            {doctors.length === 0
              ? 'No doctors are available yet.'
              : 'You have already given access to every available doctor.'}
          </p>
        ) : (
          <form onSubmit={onGrant} className="mt-3 space-y-3">
            <label htmlFor="doctor" className="sr-only">
              Doctor
            </label>
            <select
              id="doctor"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full rounded-lg border border-gray-400 bg-white p-3 text-gray-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="">Select a doctor…</option>
              {available.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {doctorLine(d) ? ` — ${doctorLine(d)}` : ''}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!selected || granting}
              className="w-full rounded-lg bg-teal-600 p-3 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {granting ? 'Granting…' : 'Grant access'}
            </button>
          </form>
        )}
      </section>

      {actionError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
          {actionError}
        </p>
      )}

      <section>
        <h2 className="mb-2 font-semibold text-gray-900">Doctors with access</h2>
        {active.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-gray-800 shadow-sm">
            No doctor can see your records right now.
          </p>
        ) : (
          <ul className="space-y-3">
            {active.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{g.doctor_name}</p>
                  {doctorLine(g) && <p className="truncate text-sm text-gray-800">{doctorLine(g)}</p>}
                  <p className="text-xs text-gray-700">Since {formatDate(g.granted_at)}</p>
                </div>
                <button
                  onClick={() => onRevoke(g)}
                  disabled={revokingId === g.id}
                  className="shrink-0 rounded-lg border border-red-400 px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-50 disabled:opacity-50"
                >
                  {revokingId === g.id ? 'Revoking…' : 'Revoke'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-gray-900">Past access</h2>
          <ul className="space-y-3">
            {past.map((g) => (
              <li key={g.id} className="rounded-xl bg-white p-4 shadow-sm">
                <p className="font-semibold text-gray-900">{g.doctor_name}</p>
                {doctorLine(g) && <p className="text-sm text-gray-800">{doctorLine(g)}</p>}
                <p className="text-xs text-gray-700">
                  {formatDate(g.granted_at)}
                  {g.revoked_at ? ` → revoked ${formatDate(g.revoked_at)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}