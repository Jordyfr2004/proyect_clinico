import type { UserRole } from './authService'

export type RestrictedArea = 'usuarios' | 'pacientes' | 'agenda' | 'actividades' | 'caja' | 'configuracion' | 'reportes'

const allowedRoles: Record<RestrictedArea, readonly UserRole[]> = {
  usuarios: ['doctora'],
  pacientes: ['doctora', 'asistente'],
  agenda: ['doctora'],
  actividades: ['doctora', 'asistente'],
  caja: ['doctora'],
  configuracion: ['doctora'],
  reportes: ['doctora'],
}

export function isStaffRole(role: UserRole | undefined): boolean {
  return role === 'doctora' || role === 'asistente'
}

export function canAccessArea(role: UserRole | undefined, area: RestrictedArea): boolean {
  return role !== undefined && allowedRoles[area].includes(role)
}
