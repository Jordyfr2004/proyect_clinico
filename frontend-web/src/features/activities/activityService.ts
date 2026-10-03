import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

const patientSchema = z.object({ codigo_paciente: z.string(), nombres: z.string() })
const activitySchema = z.object({
  id: z.string(), paciente_id: z.string(), fecha: z.string(), actividad: z.string(),
  precio: z.union([z.string(), z.number()]), paciente: patientSchema,
})
const messageSchema = z.object({ message: z.string() })

export type Activity = z.infer<typeof activitySchema>
export type ActivityPayload = { codigo_paciente: string; fecha: string; actividad: string; precio: number }
export type ActivityFilters = { fecha?: string; semana?: string; mes?: number; anio?: number; codigo_paciente?: string }
export type ActivityPeriod = { periodo: 'dia' | 'semana'; fecha: string } | { periodo: 'mes'; mes: number; anio: number } | { periodo: 'anio'; anio: number }

function requireApiBaseUrl() {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}

export async function getActivities(params: ActivityFilters = {}): Promise<Activity[]> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/actividades', { params })
  return z.object({ data: z.array(activitySchema) }).parse(data).data
}

export async function getActivityTotal(params: ActivityPeriod): Promise<{ periodo: ActivityPeriod['periodo']; total: string }> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/actividades/resumen', { params })
  return z.object({ periodo: z.enum(['dia', 'semana', 'mes', 'anio']), total: z.string() }).parse(data)
}

export async function lookupPatientByCode(code: string): Promise<z.infer<typeof patientSchema>> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>(`/actividades/paciente/codigo/${encodeURIComponent(code)}`)
  return z.object({ data: patientSchema }).parse(data).data
}

export async function createActivity(values: ActivityPayload): Promise<string> {
  requireApiBaseUrl()
  const { data } = await apiClient.post<unknown>('/actividades', values)
  return messageSchema.parse(data).message
}

export async function updateActivity(id: string, values: ActivityPayload): Promise<string> {
  requireApiBaseUrl()
  const { data } = await apiClient.put<unknown>(`/actividades/${encodeURIComponent(id)}`, values)
  return messageSchema.parse(data).message
}

export async function deleteActivity(id: string): Promise<string> {
  requireApiBaseUrl()
  const { data } = await apiClient.delete<unknown>(`/actividades/${encodeURIComponent(id)}`)
  return messageSchema.parse(data).message
}
