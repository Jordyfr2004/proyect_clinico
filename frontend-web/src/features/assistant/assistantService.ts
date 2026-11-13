import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

const assistantSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.email().nullable(),
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

export async function getAssistants(signal?: AbortSignal): Promise<Assistant[]> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/usuarios/asistentes', { signal })
  return z.object({ data: z.array(assistantSchema) }).parse(data).data
}

export async function getAssistant(id: string): Promise<Assistant> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>(`/usuarios/asistentes/${encodeURIComponent(id)}`)
  return assistantResponseSchema.parse(data).data
}

export async function createAssistant(values: CreateAssistantValues): Promise<Assistant> {
  requireApiBaseUrl()
  const { data } = await apiClient.post<unknown>('/usuarios/asistentes', values)
  return assistantResponseSchema.parse(data).data
}

export async function deactivateAssistant(id: string): Promise<void> {
  requireApiBaseUrl()
  await apiClient.put(`/usuarios/asistentes/${encodeURIComponent(id)}/desactivar`)
}

export async function activateAssistant(id: string): Promise<void> {
  requireApiBaseUrl()
  await apiClient.put(`/usuarios/asistentes/${encodeURIComponent(id)}/activar`)
}

export async function changeAssistantPassword(id: string, values: ChangeAssistantPasswordValues): Promise<void> {
  requireApiBaseUrl()
  await apiClient.put(`/usuarios/asistentes/${encodeURIComponent(id)}/password`, values)
}

export async function deleteAssistant(id: string): Promise<void> {
  requireApiBaseUrl()
  await apiClient.delete(`/usuarios/asistentes/${encodeURIComponent(id)}`)
}
