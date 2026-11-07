import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute'
import { useAuth } from './auth/AuthContext'
import AppShell from './components/AppShell'
import { homeFor } from './lib/roles'
import Login from './pages/Login'
import { Unsupported } from './pages/Placeholders'
import PatientTimeline from './pages/PatientTimeline'
import PatientUpload from './pages/PatientUpload'
import PatientAccess from './pages/PatientAccess'
import DoctorPatients from './pages/DoctorPatients'
import DoctorPatientTimeline from './pages/DoctorPatientTimeline'
import DoctorRecordReview from './pages/DoctorRecordReview'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-6 text-center text-gray-500">Loading…</div>
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/unsupported" element={<Unsupported />} />
      </Route>

      {/* Layout routes nest: ProtectedRoute checks the role, AppShell draws the chrome,
          and the matching child page renders inside AppShell's <Outlet />. */}
      <Route element={<ProtectedRoute role="patient" />}>
        <Route element={<AppShell />}>
          <Route path="/patient" element={<PatientTimeline />} />
          <Route path="/patient/upload" element={<PatientUpload />} />
          <Route path="/patient/access" element={<PatientAccess />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="doctor" />}>
        <Route element={<AppShell />}>
          <Route path="/doctor" element={<DoctorPatients />} />
          <Route path="/doctor/patients/:patientId" element={<DoctorPatientTimeline />} />
          <Route path="/doctor/records/:recordId" element={<DoctorRecordReview />} />
        </Route>
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}