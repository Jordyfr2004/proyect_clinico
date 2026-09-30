import type { UserRole } from './authService'

export type RestrictedArea = 'usuarios' | 'pacientes'

const allowedRoles: Record<RestrictedArea, readonly UserRole[]> = {
  usuarios: ['doctora'],
  pacientes: ['doctora', 'asistente'],
}

export function canAccessArea(role: UserRole | undefined, area: RestrictedArea): boolean {
  return role !== undefined && allowedRoles[area].includes(role)
}
