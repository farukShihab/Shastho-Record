export type Role = 'patient' | 'doctor'
export type DocType = 'prescription' | 'lab_report' | 'other'
export type RecordStatus = 'unverified' | 'verified'
export type RecordDetail = Omit<TimelineItem, 'date' | 'verified_by_clinic'>

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: Role
  patient_code: string | null // null for doctors
  specialty: string | null // null for patients
  clinic_name: string | null // null for patients
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
}

// Text fields may arrive as null or "" when empty, so the UI checks for both.
export interface TimelineItem {
  id: number
  patient: number
  uploaded_by: number
  uploaded_by_name: string
  doc_type: DocType
  image_url: string
  created_at: string
  status: RecordStatus
  verified_by: number | null
  verified_by_name: string | null
  verified_by_clinic: string | null
  diagnosis: string | null
  medications: string | null
  visit_date: string | null
  notes: string | null
  date: string // timeline position: visit_date if set, else upload date
}

export interface TimelineResponse {
  patient: { id: number; patient_code: string; name: string }
  count: number
  results: TimelineItem[]
}

export interface DoctorSummary {
  id: number
  name: string
  specialty: string | null
  clinic_name: string | null
}

export interface AccessGrant {
  id: number
  doctor: number
  doctor_name: string
  specialty: string | null
  clinic_name: string | null
  granted_at: string
  revoked_at: string | null
  is_active: boolean
}

export interface PatientSummary {
  id: number
  name: string
  patient_code: string
}