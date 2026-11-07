import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, apiJson } from '../lib/api'
import type { PatientSummary } from '../types'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; patients: PatientSummary[] }

function describe(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'Only doctors can view this list.'
    return `The server returned an error (${err.status}).`
  }
  return 'Could not reach the server. Check your connection.'
}

export default function DoctorPatients() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    apiJson<PatientSummary[]>('/api/patients/')
      .then((patients) => active && setState({ status: 'ready', patients }))
      .catch((err) => active && setState({ status: 'error', message: describe(err) }))
    return () => {
      active = false
    }
  }, [reloadKey])

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold text-teal-900">My patients</h1>

      {state.status === 'loading' && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading patients">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse rounded-xl bg-white p-4 shadow-sm">
              <div className="h-4 w-40 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-24 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      )}

      {state.status === 'error' && (
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
      )}

      {state.status === 'ready' &&
        (state.patients.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center shadow-sm">
            <p className="font-semibold text-gray-900">No patients yet</p>
            <p className="mt-1 text-sm text-gray-800">
              Patients appear here after they give you access to their records.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {state.patients.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/doctor/patients/${p.id}`}
                  className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm hover:bg-gray-50"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <p className="text-sm text-gray-800">{p.patient_code}</p>
                  </div>
                  <span aria-hidden="true" className="text-xl text-gray-700">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </div>
  )
}