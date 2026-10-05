import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

const accountSchema = z.object({
  id: z.string(), name: z.string(), email: z.string().nullable(), username: z.string(),
  role: z.enum(['doctora', 'asistente', 'paciente']), paciente_id: z.string().nullable(),
  activo: z.boolean(), created_at: z.string().nullable(),
})
export type Account = z.infer<typeof accountSchema>

function requireApiBaseUrl() {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}

export async function getPatientAccounts(): Promise<Account[]> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/usuarios')
  return z.object({ data: z.array(accountSchema) }).parse(data).data.filter((account) => account.role === 'paciente')
}

async function updateAccount(id: string, action: 'activar' | 'desactivar' | 'desvincular-paciente'): Promise<string> {
  requireApiBaseUrl()
  const { data } = await apiClient.put<unknown>(`/usuarios/${encodeURIComponent(id)}/${action}`)
  return z.object({ message: z.string(), data: accountSchema.pick({ id: true, role: true, paciente_id: true, activo: true }).passthrough() }).parse(data).message
}

export const activatePatientAccount = (id: string) => updateAccount(id, 'activar')
export const deactivatePatientAccount = (id: string) => updateAccount(id, 'desactivar')
export const unlinkPatientAccount = (id: string) => updateAccount(id, 'desvincular-paciente')
