import { Link, useParams } from 'react-router-dom'
import TimelineView from '../components/TimelineView'

export default function DoctorPatientTimeline() {
  const { patientId } = useParams()
  const id = Number(patientId)

  return (
    <div>
      <Link to="/doctor" className="text-sm font-medium text-teal-800 hover:underline">
        ← Patients
      </Link>
      <h1 className="mb-3 mt-2 text-xl font-bold text-teal-900">Patient timeline</h1>

      {Number.isInteger(id) ? (
        <TimelineView
          patientId={id}
          showPatient
          empty={<p className="text-gray-900">This patient has no records yet.</p>}
          renderActions={(item) => (
            <Link
              to={`/doctor/records/${item.id}`}
              className="block rounded-lg border border-teal-700 p-2 text-center text-sm font-medium text-teal-900 hover:bg-teal-50"
            >
              {item.status === 'verified' ? 'Edit details' : 'Review & verify'}
            </Link>
          )}
        />
      ) : (
        <p className="rounded-xl bg-red-50 p-5 text-center text-red-900">Invalid patient.</p>
      )}
    </div>
  )
}