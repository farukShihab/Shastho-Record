import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, apiJson } from '../lib/api'
import type { DocType } from '../types'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB, same limit as the server
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPT = ALLOWED_TYPES.join(',')

const DOC_OPTIONS: { value: DocType; label: string }[] = [
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab_report', label: 'Lab report' },
  { value: 'other', label: 'Other document' },
]

// Client-side checks are only a convenience (fast feedback, no wasted upload).
// The server validates again and is the real gatekeeper.
function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Please choose a JPEG, PNG or WebP image.'
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return `This image is ${mb} MB. The limit is 5 MB.`
  }
  return null
}

// DRF returns 400 errors as {"image": ["..."], "doc_type": ["..."]}.
function describe(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400 && err.data && typeof err.data === 'object') {
      const lines = Object.values(err.data as Record<string, unknown>)
        .flatMap((v) => (Array.isArray(v) ? v : [v]))
        .map(String)
      if (lines.length > 0) return lines.join(' ')
    }
    if (err.status === 403) return 'Only patients can upload records.'
    return `The server returned an error (${err.status}).`
  }
  return 'Could not reach the server. Check your connection and try again.'
}

export default function PatientUpload() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [docType, setDocType] = useState<DocType | ''>('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Object URLs keep the file in memory until revoked. We create one per pick,
  // revoke the old one when the file changes, and revoke the last one on unmount.
  const previewRef = useRef<string | null>(null)
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    }
  }, [])

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    e.target.value = '' // lets the user pick the same file again after removing it
    if (!picked) return

    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setPreview(null)
    setFile(null)

    const problem = validateFile(picked)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    previewRef.current = URL.createObjectURL(picked)
    setPreview(previewRef.current)
    setFile(picked)
  }

  function clearFile() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setPreview(null)
    setFile(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file || !docType) return
    setError('')
    setSubmitting(true)
    try {
      // The server accepts exactly two fields: image and doc_type.
      // Don't set Content-Type: apiFetch leaves it alone for FormData so the
      // browser can add the multipart boundary itself.
      const form = new FormData()
      form.append('image', file)
      form.append('doc_type', docType)
      await apiJson<unknown>('/api/records/', { method: 'POST', body: form })
      navigate('/patient') // the timeline refetches when it mounts, so the new record shows
    } catch (err) {
      setError(describe(err))
      setSubmitting(false)
    }
  }

  const fileInputClass = 'hidden'

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold text-teal-900">Upload a record</h1>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
        {/* Two hidden inputs, two visible buttons. `capture` opens the camera
            directly on phones but would remove the gallery option, so we offer both.
            On desktop browsers `capture` is ignored and you get a file dialog. */}
        <input
          id="camera-input"
          type="file"
          accept={ACCEPT}
          capture="environment"
          className={fileInputClass}
          onChange={onPick}
        />
        <input
          id="file-input"
          type="file"
          accept={ACCEPT}
          className={fileInputClass}
          onChange={onPick}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-gray-900">Document image</p>
          <div className="grid grid-cols-2 gap-3">
            <label
              htmlFor="camera-input"
              className="cursor-pointer rounded-lg border border-teal-700 p-3 text-center font-medium text-teal-900 hover:bg-teal-50"
            >
              Take photo
            </label>
            <label
              htmlFor="file-input"
              className="cursor-pointer rounded-lg border border-teal-700 p-3 text-center font-medium text-teal-900 hover:bg-teal-50"
            >
              Choose file
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-700">JPEG, PNG or WebP, up to 5 MB.</p>
        </div>

        {preview && file && (
          <div>
            <img
              src={preview}
              alt="Preview of the selected document"
              className="max-h-80 w-full rounded-lg bg-gray-100 object-contain"
            />
            <div className="mt-2 flex items-center justify-between gap-2 text-sm text-gray-800">
              <span className="truncate">
                {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
              </span>
              <button
                type="button"
                onClick={clearFile}
                className="shrink-0 rounded-lg border border-gray-400 px-3 py-1 hover:bg-gray-100"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="doc-type" className="mb-1 block text-sm font-medium text-gray-900">
            Document type
          </label>
          <select
            id="doc-type"
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocType | '')}
            className="w-full rounded-lg border border-gray-400 bg-white p-3 text-gray-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            <option value="">Select a type…</option>
            {DOC_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!file || !docType || submitting}
          className="w-full rounded-lg bg-teal-600 p-3 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {submitting ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </div>
  )
}