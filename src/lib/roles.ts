import type { Role } from '../types'

export function homeFor(role: Role): string {
  if (role === 'doctor') return '/doctor'
  if (role === 'patient') return '/patient'
  return '/unsupported'
}