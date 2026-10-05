import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

const actionSchema = z.object({
  id: z.string(), user_id: z.string().nullable(), usuario: z.string().nullable(), rol: z.string().nullable(),
  modulo: z.string(), accion: z.string(), detalle: z.string().nullable(), visible: z.boolean(), created_at: z.string(),
})
const sessionSchema = z.object({ id: z.string(), user_id: z.string().nullable(), usuario: z.string().nullable(), rol: z.string().nullable(), accion: z.string(), created_at: z.string() })
export type RecordedAction = z.infer<typeof actionSchema>
export type RecordedSession = z.infer<typeof sessionSchema>

function requireApiBaseUrl() {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}

export async function getRecordedActions(fecha?: string): Promise<RecordedAction[]> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/configuracion/acciones', { params: fecha ? { fecha } : {} })
  return z.object({ acciones: z.array(actionSchema) }).parse(data).acciones
}

export async function getRecordedSessions(fecha?: string): Promise<RecordedSession[]> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/configuracion/sesiones', { params: fecha ? { fecha } : {} })
  return z.object({ sesiones: z.array(sessionSchema) }).parse(data).sesiones
}

export async function hideRecordedAction(id: string): Promise<string> {
  requireApiBaseUrl()
  const { data } = await apiClient.delete<unknown>(`/configuracion/acciones/${encodeURIComponent(id)}`)
  return z.object({ message: z.string() }).parse(data).message
}
