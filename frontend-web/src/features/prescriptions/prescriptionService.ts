import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

const medicationSchema = z.object({
  nombre: z.string(), dosis: z.string(), frecuencia: z.string(),
  duracion: z.string().nullable().optional(), indicaciones: z.string().nullable().optional(),
})
const prescriptionSchema = z.object({
  id: z.string(), paciente_id: z.string(), agenda_id: z.string().nullable(), fecha: z.string(),
  diagnostico: z.string().nullable(), medicamentos: z.array(medicationSchema), indicaciones: z.string().nullable(),
  paciente: z.object({ id: z.string(), codigo_paciente: z.string(), nombres: z.string(), cedula: z.string() }).nullable().optional(),
  emitida_por: z.object({ id: z.string(), name: z.string(), role: z.string() }).nullable().optional(),
})
const templateSchema = z.object({
  id: z.string(), nombre: z.string(), medicamentos: z.array(medicationSchema), indicaciones: z.string().nullable(), activo: z.boolean(),
})

export type Medication = z.infer<typeof medicationSchema>
export type Prescription = z.infer<typeof prescriptionSchema>
export type PrescriptionTemplate = z.infer<typeof templateSchema>
export type PrescriptionPayload = { paciente_id: string; diagnostico?: string; indicaciones?: string; medicamentos: Medication[] }
export type TemplatePayload = { nombre: string; indicaciones?: string; medicamentos: Medication[]; activo?: boolean }

function requireApiBaseUrl() {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}

export async function getPatientPrescriptions(patientId: string, signal?: AbortSignal): Promise<Prescription[]> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/recetas', { params: { paciente_id: patientId }, ...(signal ? { signal } : {}) })
  return z.object({ data: z.array(prescriptionSchema) }).parse(data).data
}

export async function createPrescription(values: PrescriptionPayload): Promise<Prescription> {
  requireApiBaseUrl()
  const { data } = await apiClient.post<unknown>('/recetas', values)
  return z.object({ data: prescriptionSchema }).parse(data).data
}

export async function deletePrescription(id: string): Promise<void> {
  requireApiBaseUrl()
  await apiClient.delete(`/recetas/${encodeURIComponent(id)}`)
}

export async function getPrescriptionTemplates(activeOnly = false, signal?: AbortSignal): Promise<PrescriptionTemplate[]> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/plantillas-receta', { params: activeOnly ? { activas: 1 } : {}, ...(signal ? { signal } : {}) })
  return z.object({ data: z.array(templateSchema) }).parse(data).data
}

export async function createPrescriptionTemplate(values: TemplatePayload): Promise<PrescriptionTemplate> {
  requireApiBaseUrl()
  const { data } = await apiClient.post<unknown>('/plantillas-receta', values)
  return z.object({ data: templateSchema }).parse(data).data
}

export async function updatePrescriptionTemplate(id: string, values: Partial<TemplatePayload>): Promise<PrescriptionTemplate> {
  requireApiBaseUrl()
  const { data } = await apiClient.put<unknown>(`/plantillas-receta/${encodeURIComponent(id)}`, values)
  return z.object({ data: templateSchema }).parse(data).data
}

export async function deletePrescriptionTemplate(id: string): Promise<void> {
  requireApiBaseUrl()
  await apiClient.delete(`/plantillas-receta/${encodeURIComponent(id)}`)
}
