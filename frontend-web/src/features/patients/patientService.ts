import { z } from 'zod'
import { apiClient } from '../../services/apiClient'
import { paginatedSchema } from '../../services/pagination'

const patientProfileSchema = z.object({
  codigo_paciente: z.string(),
  nombres: z.string(),
  cedula: z.string(),
  telefono: z.string().nullable(),
  direccion: z.string().nullable(),
  fecha_nacimiento: z.string().nullable(),
  foto_perfil_url: z.string().nullable().optional(),
})
const patientSchema = patientProfileSchema.extend({ id: z.string() })
const patientPageSchema = paginatedSchema(patientSchema)

export type PatientProfile = z.infer<typeof patientProfileSchema>
export type Patient = z.infer<typeof patientSchema>
export type PatientPage = z.infer<typeof patientPageSchema>
export type CreatePatientPayload = {
  nombres: string
  cedula: string
  telefono: string | null
  direccion: string | null
  fecha_nacimiento: string | null
}
export type CreatePatientResponse = { message: string; patient: Patient }
export type UpdatePatientPayload = Partial<CreatePatientPayload>

function requireApiBaseUrl(): void {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}

export async function getPatients(params: { buscar?: string; page?: number } = {}, signal?: AbortSignal): Promise<PatientPage> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/pacientes', { params, ...(signal ? { signal } : {}) })
  return patientPageSchema.parse(data)
}

export async function getPatient(id: string): Promise<Patient> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>(`/pacientes/${encodeURIComponent(id)}`)
  return z.object({ data: patientSchema }).parse(data).data
}

export async function createPatient(values: CreatePatientPayload): Promise<CreatePatientResponse> {
  requireApiBaseUrl()
  const { data } = await apiClient.post<unknown>('/pacientes', values)
  const parsed = z.object({ message: z.string(), data: patientSchema }).parse(data)
  return { message: parsed.message, patient: parsed.data }
}

export async function updatePatient(id: string, values: UpdatePatientPayload): Promise<CreatePatientResponse> {
  requireApiBaseUrl()
  const { data } = await apiClient.put<unknown>(`/pacientes/${encodeURIComponent(id)}`, values)
  const parsed = z.object({ message: z.string(), data: patientSchema }).parse(data)
  return { message: parsed.message, patient: parsed.data }
}
