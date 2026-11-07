import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RecordImage } from '../components/TimelineCard'
import { ApiError, apiJson } from '../lib/api'
import { useImageCache } from '../lib/useImageCache'
import type { RecordDetail } from '../types'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; record: RecordDetail }

function describeLoad(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return 'This record is not available to you.'
    if (err.status === 403) return "You don't have access to this record."
    return `The server returned an error (${err.status}).`
  }
  return 'Could not reach the server. Check your connection.'
}

// DRF 400s look like {"visit_date": ["Date has wrong format..."]}.
// Turn that into one message per field so we can show it under the right input.
function fieldErrors(data: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [key, value] of Object.entries(data)) {
      out[key] = (Array.isArray(value) ? value : [value]).map(String).join(' ')
    }
  }
  return out
}

const inputClass =
  'w-full rounded-lg border border-gray-400 bg-white p-3 text-gray-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600'

function ReviewForm({ record }: { record: RecordDetail }) {
  const navigate = useNavigate()
  const loadImage = useImageCache()
  // The form starts from the record's current values (null -> empty string).
  // This component only mounts once the record has loaded, so plain useState
  // initial values are enough and we need no syncing effect.
  const [diagnosis, setDiagnosis] = useState(record.diagnosis ?? '')
  const [medications, setMedications] = useState(record.medications ?? '')
  const [visitDate, setVisitDate] = useState((record.visit_date ?? '').slice(0, 10))
  const [notes, setNotes] = useState(record.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    setGeneral('')
    setSaving(true)
    try {
      const body: Record<string, string> = {
        diagnosis: diagnosis.trim(),
        medications: medications.trim(),
        notes: notes.trim(),
      }
      // An empty date input would be sent as "", which a date field rejects,
      // so we only send it when the doctor picked one.
      if (visitDate) body.visit_date = visitDate

      const updated = await apiJson<RecordDetail>(`/api/records/${record.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      // Going back remounts the timeline, which refetches: that is our "refresh".
      navigate(`/doctor/patients/${updated.patient}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const fields = fieldErrors(err.data)
        setErrors(fields)
        setGeneral(fields.detail ?? fields.non_field_errors ?? 'Please fix the highlighted fields.')
      } else if (err instanceof ApiError && err.status === 403) {
        setGeneral('You no longer have access to this patient, so this record cannot be changed.')
      } else if (err instanceof ApiError) {
        setGeneral(`The server returned an error (${err.status}).`)
      } else {
        setGeneral('Could not reach the server. Your changes are still here, so try again.')
      }
      setSaving(false)
    }
  }

  const verified = record.status === 'verified'

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <RecordImage recordId={record.id} loadImage={loadImage} />
        <p className="mt-2 text-sm text-gray-800">
          Status:{' '}
          <span className="font-semibold">
            {verified
              ? `Verified${record.verified_by_name ? ` by ${record.verified_by_name}` : ''}`
              : 'Unverified'}
          </span>
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-800">
          Fill in what the document shows. Saving marks this record as verified under your name.
        </p>

        <div>
          <label htmlFor="diagnosis" className="mb-1 block text-sm font-medium text-gray-900">
            Diagnosis
          </label>
          <input
            id="diagnosis"
            className={inputClass}
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />
          {errors.diagnosis && <p className="mt-1 text-sm text-red-800">{errors.diagnosis}</p>}
        </div>

        <div>
          <label htmlFor="medications" className="mb-1 block text-sm font-medium text-gray-900">
            Medications
          </label>
          <textarea
            id="medications"
            rows={3}
            className={inputClass}
            value={medications}
            onChange={(e) => setMedications(e.target.value)}
          />
          {errors.medications && <p className="mt-1 text-sm text-red-800">{errors.medications}</p>}
        </div>

        <div>
          <label htmlFor="visit-date" className="mb-1 block text-sm font-medium text-gray-900">
            Visit date
          </label>
          <input
            id="visit-date"
            type="date"
            className={inputClass}
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
          />
          {errors.visit_date && <p className="mt-1 text-sm text-red-800">{errors.visit_date}</p>}
        </div>

        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-900">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            className={inputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {errors.notes && <p className="mt-1 text-sm text-red-800">{errors.notes}</p>}
        </div>

        {general && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
            {general}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-teal-600 p-3 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : verified ? 'Save changes' : 'Save and verify'}
        </button>
      </form>
    </div>
  )
}

export default function DoctorRecordReview() {
  const { recordId } = useParams()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    apiJson<RecordDetail>(`/api/records/${recordId}/`)
      .then((record) => active && setState({ status: 'ready', record }))
      .catch((err) => active && setState({ status: 'error', message: describeLoad(err) }))
    return () => {
      active = false
    }
  }, [recordId, reloadKey])

  // Back goes to the patient's timeline once we know the patient, else to the list.
  const backTo = state.status === 'ready' ? `/doctor/patients/${state.record.patient}` : '/doctor'

  return (
    <div>
      <Link to={backTo} className="text-sm font-medium text-teal-800 hover:underline">
        ← Back
      </Link>
      <h1 className="mb-3 mt-2 text-xl font-bold text-teal-900">Review record</h1>

      {state.status === 'loading' && (
        <div className="animate-pulse rounded-xl bg-white p-4 shadow-sm" aria-busy="true">
          <div className="aspect-[4/3] rounded-lg bg-gray-200" />
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

      {state.status === 'ready' && <ReviewForm record={state.record} />}
    </div>
  )
}