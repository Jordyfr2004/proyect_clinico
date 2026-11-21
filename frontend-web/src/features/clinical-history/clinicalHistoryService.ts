import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

const historyFieldsSchema = z.object({
  sexo: z.string().nullable(),
  lugar_nacimiento: z.string().nullable(),
  antecedentes_enfermedades: z.string().nullable(),
  cirugias: z.string().nullable(),
  medicacion_actual: z.string().nullable(),
})

const clinicalHistorySchema = historyFieldsSchema.extend({
  id: z.string().min(1),
  paciente_id: z.string().min(1),
})

const historyResponseSchema = z.object({ data: clinicalHistorySchema })

export type ClinicalHistory = z.infer<typeof clinicalHistorySchema>
export type ClinicalHistoryFields = z.infer<typeof historyFieldsSchema>
export type CreateClinicalHistory = ClinicalHistoryFields & { paciente_id: string }

function requireApiBaseUrl(): void {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}

export async function getClinicalHistoryByPatient(patientId: string): Promise<ClinicalHistory> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>(`/historiales-clinicos/paciente/${encodeURIComponent(patientId)}`)
  return historyResponseSchema.parse(data).data
}

export async function createClinicalHistory(values: CreateClinicalHistory): Promise<ClinicalHistory> {
  requireApiBaseUrl()
  const { data } = await apiClient.post<unknown>('/historiales-clinicos', values)
  return historyResponseSchema.parse(data).data
}

export async function updateClinicalHistory(id: string, values: ClinicalHistoryFields): Promise<ClinicalHistory> {
  requireApiBaseUrl()
  const { data } = await apiClient.put<unknown>(`/historiales-clinicos/${encodeURIComponent(id)}`, values)
  return historyResponseSchema.parse(data).data
}
