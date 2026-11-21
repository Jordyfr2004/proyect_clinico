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
const appointmentSummarySchema = z.object({
  data: z.object({
    cita: z.object({
      id: z.string().min(1), fecha: z.iso.date(), hora_inicio: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
      hora_fin: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/), estado: z.string().min(1), descripcion: z.string().nullable(),
    }),
    paciente: z.object({ codigo_paciente: z.string().min(1), nombres: z.string().min(1) }),
  }).nullable(),
})

export type AgendaEntry = z.infer<typeof agendaEntrySchema>
export type AppointmentSummary = NonNullable<z.infer<typeof appointmentSummarySchema>['data']>
export type AgendaSlot = { fecha: string; hora_inicio: string; hora_fin: string }
export type PersonalEntryPayload = AgendaSlot & { descripcion: string }
export type MedicalAppointmentPayload = AgendaSlot & { codigo_paciente: string; descripcion: string | null }
export type AgendaUpdatePayload = Partial<AgendaSlot & { descripcion: string | null }>
export type ClinicalDataPayload = { diagnostico: string; tratamiento: string; observacion: string | null }
export type CompleteAppointmentPayload = { actividad: string; precio: number }

function requireApiBaseUrl() {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}

export async function getAgendaMonth(mes: number, anio: number, signal?: AbortSignal): Promise<AgendaEntry[]> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/agenda', { params: { mes, anio }, ...(signal ? { signal } : {}) })
  return listSchema.parse(data).data
}

export async function getPendingRequests(signal?: AbortSignal): Promise<AgendaEntry[]> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/agenda', { params: { estado: 'pendiente' }, ...(signal ? { signal } : {}) })
  return listSchema.parse(data).data
}

export async function getAppointmentSummary(id: string, signal?: AbortSignal): Promise<AppointmentSummary | null> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>(`/resumen-cita/${encodeURIComponent(id)}`, signal ? { signal } : undefined)
  return appointmentSummarySchema.refine((response) => response.data === null || response.data.cita.id === id, { message: 'El ID de la cita no coincide' }).parse(data).data
}

async function post(path: string, values: PersonalEntryPayload | MedicalAppointmentPayload): Promise<string> {
  requireApiBaseUrl()
  const { data } = await apiClient.post<unknown>(path, values)
  return messageSchema.parse(data).message
}

async function put(path: string, values?: AgendaSlot | AgendaUpdatePayload | ClinicalDataPayload | CompleteAppointmentPayload): Promise<string> {
  requireApiBaseUrl()
  const { data } = values === undefined ? await apiClient.put<unknown>(path) : await apiClient.put<unknown>(path, values)
  return messageSchema.parse(data).message
}

export const createPersonalEntry = (values: PersonalEntryPayload) => post('/agenda/personal', values)
export const createMedicalAppointment = (values: MedicalAppointmentPayload) => post('/agenda/cita-medica', values)
export const programRequest = (id: string, values: AgendaSlot) => put(`/agenda/solicitud/${encodeURIComponent(id)}/programar`, values)
export const updateAgendaEntry = (id: string, values: AgendaUpdatePayload) => put(`/agenda/${encodeURIComponent(id)}`, values)
export const cancelAppointment = (id: string) => put(`/agenda/${encodeURIComponent(id)}/cancelar`)
export const completeAppointment = (id: string, values: CompleteAppointmentPayload) => put(`/agenda/${encodeURIComponent(id)}/completar`, values)
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
