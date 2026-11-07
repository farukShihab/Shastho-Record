import { useEffect, useState, type ReactNode } from 'react'
import { ApiError, apiJson } from '../lib/api'
import { useImageCache } from '../lib/useImageCache'
import type { TimelineItem, TimelineResponse } from '../types'
import TimelineCard from './TimelineCard'

type Order = 'desc' | 'asc'

// One value describes the whole screen, so we can never be in a contradictory
// state like "loading AND error".
type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: TimelineResponse }

function describe(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return "You don't have access to this timeline."
    if (err.status === 400) return 'The request was not valid.'
    return `The server returned an error (${err.status}).`
  }
  return 'Could not reach the server. Check your connection.'
}

// patientId is for doctors; patients omit it and get their own timeline.
// showPatient adds a "Name · code" line (useful for doctors).
// renderActions lets the parent add buttons to each card (e.g. "Review").
export default function TimelineView({
  patientId,
  empty,
  showPatient = false,
  renderActions,
}: {
  patientId?: number
  empty: ReactNode
  showPatient?: boolean
  renderActions?: (item: TimelineItem) => ReactNode
}) {
  const [order, setOrder] = useState<Order>('desc')
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState<State>({ status: 'loading' })
  const loadImage = useImageCache()

  useEffect(() => {
    let active = true // ignore a response that arrives after we changed or left
    const params = new URLSearchParams()
    if (patientId !== undefined) params.set('patient', String(patientId))
    if (order === 'asc') params.set('order', 'asc')
    const qs = params.toString()

    apiJson<TimelineResponse>(`/api/timeline/${qs ? `?${qs}` : ''}`)
      .then((data) => active && setState({ status: 'ready', data }))
      .catch((err) => active && setState({ status: 'error', message: describe(err) }))

    return () => {
      active = false
    }
  }, [patientId, order, reloadKey])

  function changeOrder() {
    setState({ status: 'loading' })
    setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
  }

  function retry() {
    setState({ status: 'loading' })
    setReloadKey((k) => k + 1)
  }

  if (state.status === 'loading') {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading timeline">
        {[0, 1].map((i) => (
          <div key={i} className="animate-pulse rounded-xl bg-white p-4 shadow-sm">
            <div className="h-3 w-24 rounded bg-gray-200" />
            <div className="mt-2 h-5 w-36 rounded bg-gray-200" />
            <div className="mt-3 aspect-[4/3] rounded-lg bg-gray-200" />
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
          onClick={retry}
          className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100"
        >
          Try again
        </button>
      </div>
    )
  }

  const { data } = state
  const patientLine = showPatient ? (
    <p className="mb-3 text-gray-900">
      <span className="font-semibold">{data.patient.name}</span> · {data.patient.patient_code}
    </p>
  ) : null

  if (data.results.length === 0) {
    return (
      <div>
        {patientLine}
        <div className="rounded-xl bg-white p-6 text-center shadow-sm">{empty}</div>
      </div>
    )
  }

  return (
    <div>
      {patientLine}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-800">
          {data.count} {data.count === 1 ? 'record' : 'records'}
        </p>
        <button
          onClick={changeOrder}
          className="rounded-lg border border-gray-400 px-3 py-1 text-sm text-gray-900 hover:bg-gray-100"
        >
          {order === 'desc' ? 'Newest first' : 'Oldest first'}
        </button>
      </div>
      <div className="space-y-4">
        {data.results.map((item) => (
          <TimelineCard
            key={item.id}
            item={item}
            loadImage={loadImage}
            actions={renderActions?.(item)}
          />
        ))}
      </div>
    </div>
  )
}