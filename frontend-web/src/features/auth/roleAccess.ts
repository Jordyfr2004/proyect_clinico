import type { UserRole } from './authService'

export type RestrictedArea = 'usuarios' | 'pacientes' | 'mi-perfil'

const allowedRoles: Record<RestrictedArea, readonly UserRole[]> = {
  usuarios: ['doctora'],
  pacientes: ['doctora', 'asistente'],
  'mi-perfil': ['paciente'],
}

export function canAccessArea(role: UserRole | undefined, area: RestrictedArea): boolean {
  return role !== undefined && allowedRoles[area].includes(role)
}
