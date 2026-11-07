import { Link } from 'react-router-dom'
import TimelineView from '../components/TimelineView'

export default function PatientTimeline() {
  return (
    <div>
      <h1 className="mb-3 text-xl font-bold text-teal-900">My timeline</h1>
      <TimelineView
        empty={
          <>
            <p className="font-semibold text-gray-900">No records yet</p>
            <p className="mt-1 text-sm text-gray-800">
              Upload a prescription or lab report to start your timeline.
            </p>
            <Link
              to="/patient/upload"
              className="mt-4 inline-block rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700"
            >
              Upload a record
            </Link>
          </>
        }
      />
    </div>
  )
}