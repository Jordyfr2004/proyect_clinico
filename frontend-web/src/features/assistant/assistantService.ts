import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

const assistantSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string(),
  username: z.string(),
  role: z.literal('asistente'),
  activo: z.boolean(),
})
const assistantResponseSchema = z.object({ data: assistantSchema })

export type Assistant = z.infer<typeof assistantSchema>
export type CreateAssistantValues = { name: string; email: string; username: string; password: string }
export type ChangeAssistantPasswordValues = { password: string; password_confirmation: string }

function requireApiBaseUrl(): void {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}

export async function getAssistant(): Promise<Assistant> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/usuarios/asistente')
  return assistantResponseSchema.parse(data).data
}

export async function createAssistant(values: CreateAssistantValues): Promise<Assistant> {
  requireApiBaseUrl()
  const { data } = await apiClient.post<unknown>('/usuarios/asistente', values)
  return assistantResponseSchema.parse(data).data
}

export async function deactivateAssistant(): Promise<void> {
  requireApiBaseUrl()
  await apiClient.post('/usuarios/asistente/desactivar')
}

export async function activateAssistant(): Promise<void> {
  requireApiBaseUrl()
  await apiClient.post('/usuarios/asistente/activar')
}

export async function changeAssistantPassword(values: ChangeAssistantPasswordValues): Promise<void> {
  requireApiBaseUrl()
  await apiClient.post('/usuarios/asistente/password', values)
}
