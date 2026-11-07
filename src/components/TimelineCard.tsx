import { useEffect, useState, type ReactNode } from 'react'
import { formatDate } from '../lib/format'
import type { DocType, TimelineItem } from '../types'

const DOC_LABEL: Record<DocType, string> = {
  prescription: 'Prescription',
  lab_report: 'Lab report',
  other: 'Other document',
}

export function RecordImage({
  recordId,
  loadImage,
}: {
  recordId: number
  loadImage: (id: number) => Promise<string>
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    loadImage(recordId)
      .then((url) => active && setSrc(url))
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
  }, [recordId, loadImage, attempt])

  if (failed) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg bg-gray-100 text-sm text-gray-800">
        <span>Could not load the image.</span>
        <button
          onClick={() => {
            setFailed(false)
            setAttempt((a) => a + 1)
          }}
          className="rounded-lg border border-gray-400 px-3 py-1 hover:bg-gray-200"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!src) return <div className="aspect-[4/3] animate-pulse rounded-lg bg-gray-200" />

  return (
    // Opens the full image in a new tab (blob URLs work there too).
    <a href={src} target="_blank" rel="noreferrer">
      <img
        src={src}
        alt="Scanned medical document"
        className="max-h-96 w-full rounded-lg bg-gray-100 object-contain"
      />
    </a>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">{label}</p>
      <p className="whitespace-pre-line text-gray-900">{value}</p>
    </div>
  )
}

export default function TimelineCard({
  item,
  loadImage,
  actions,
}: {
  item: TimelineItem
  loadImage: (id: number) => Promise<string>
  actions?: ReactNode
}) {
  const verified = item.status === 'verified'

  return (
    <article className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
            {DOC_LABEL[item.doc_type]}
          </p>
          <p className="text-lg font-semibold text-gray-900">{formatDate(item.date)}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            verified ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'
          }`}
        >
          {verified ? 'Verified' : 'Unverified'}
        </span>
      </div>

      <div className="mt-3">
        <RecordImage recordId={item.id} loadImage={loadImage} />
      </div>

      <div className="mt-3 space-y-3">
        {verified && item.verified_by_name && (
          <p className="text-sm text-gray-800">
            Verified by <span className="font-semibold">{item.verified_by_name}</span>
            {item.verified_by_clinic ? `, ${item.verified_by_clinic}` : ''}
          </p>
        )}
        {item.diagnosis && <Field label="Diagnosis" value={item.diagnosis} />}
        {item.medications && <Field label="Medications" value={item.medications} />}
        <p className="text-xs text-gray-700">Uploaded {formatDate(item.created_at)}</p>
      </div>
    {actions && <div className="mt-4 border-t pt-3">{actions}</div>}
    </article>
  )
}