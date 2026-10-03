import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

const agendaEntrySchema = z.object({
  id: z.string(), paciente_id: z.string().nullable(), fecha: z.string().nullable(),
  hora_inicio: z.string().nullable(), hora_fin: z.string().nullable(),
  tipo: z.enum(['personal', 'cita_medica']), descripcion: z.string().nullable(),
  estado: z.enum(['pendiente', 'programada', 'cancelada', 'completada']).nullable(),
  diagnostico: z.string().nullable(), tratamiento: z.string().nullable(), observacion: z.string().nullable(),
  paciente: z.object({ codigo_paciente: z.string(), nombres: z.string() }).nullable(),
})
const listSchema = z.object({ data: z.array(agendaEntrySchema) })
const messageSchema = z.object({ message: z.string() })

export type AgendaEntry = z.infer<typeof agendaEntrySchema>
export type AgendaSlot = { fecha: string; hora_inicio: string; hora_fin: string }
export type PersonalEntryPayload = AgendaSlot & { descripcion: string }
export type MedicalAppointmentPayload = AgendaSlot & { codigo_paciente: string; descripcion: string | null }
export type AgendaUpdatePayload = Partial<AgendaSlot & { descripcion: string | null }>
export type ClinicalDataPayload = { diagnostico: string; tratamiento: string; observacion: string | null }

function requireApiBaseUrl() {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}

export async function getAgendaMonth(mes: number, anio: number): Promise<AgendaEntry[]> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/agenda', { params: { mes, anio } })
  return listSchema.parse(data).data
}

export async function getPendingRequests(): Promise<AgendaEntry[]> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/agenda', { params: { estado: 'pendiente' } })
  return listSchema.parse(data).data
}

async function post(path: string, values: PersonalEntryPayload | MedicalAppointmentPayload): Promise<string> {
  requireApiBaseUrl()
  const { data } = await apiClient.post<unknown>(path, values)
  return messageSchema.parse(data).message
}

async function put(path: string, values?: AgendaSlot | AgendaUpdatePayload | ClinicalDataPayload): Promise<string> {
  requireApiBaseUrl()
  const { data } = values === undefined ? await apiClient.put<unknown>(path) : await apiClient.put<unknown>(path, values)
  return messageSchema.parse(data).message
}

export const createPersonalEntry = (values: PersonalEntryPayload) => post('/agenda/personal', values)
export const createMedicalAppointment = (values: MedicalAppointmentPayload) => post('/agenda/cita-medica', values)
export const programRequest = (id: string, values: AgendaSlot) => put(`/agenda/solicitud/${encodeURIComponent(id)}/programar`, values)
export const updateAgendaEntry = (id: string, values: AgendaUpdatePayload) => put(`/agenda/${encodeURIComponent(id)}`, values)
export const cancelAppointment = (id: string) => put(`/agenda/${encodeURIComponent(id)}/cancelar`)
export const completeAppointment = (id: string) => put(`/agenda/${encodeURIComponent(id)}/completar`)
export async function registerClinicalData(id: string, values: ClinicalDataPayload): Promise<string> {
  requireApiBaseUrl()
  const { data } = await apiClient.put<unknown>(`/agenda/${encodeURIComponent(id)}/datos-clinicos`, values)
  return z.object({ message: z.string(), data: agendaEntrySchema }).parse(data).message
}
export async function deleteAgendaEntry(id: string): Promise<string> {
  requireApiBaseUrl()
  const { data } = await apiClient.delete<unknown>(`/agenda/${encodeURIComponent(id)}`)
  return messageSchema.parse(data).message
}
