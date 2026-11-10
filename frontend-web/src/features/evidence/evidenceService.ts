import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

const evidenceSchema = z.object({
  id: z.string(), paciente_id: z.string(), tipo: z.enum(['caso_clinico', 'rx', 'documento']),
  nombre_archivo: z.string(), ruta_archivo: z.string(), mime_type: z.string(),
  tamano: z.number(), descripcion: z.string().nullable(), fecha: z.string(),
  subido_por: z.object({ id: z.string(), name: z.string(), role: z.string() }).nullable().optional(),
})
const responseSchema = z.object({
  paciente: z.object({ id: z.string(), codigo_paciente: z.string(), nombres: z.string() }),
  data: z.array(evidenceSchema),
})

export type Evidence = z.infer<typeof evidenceSchema>
export type EvidenceType = Evidence['tipo']
export type EvidenceUpload = { tipo: EvidenceType; archivo: File; descripcion?: string }

export const EVIDENCE_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf'
export const EVIDENCE_MAX_BYTES = 20 * 1024 * 1024

function requireApiBaseUrl() {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}

export async function getPatientEvidence(patientId: string): Promise<Evidence[]> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>(`/evidencias-clinicas/paciente/${encodeURIComponent(patientId)}`)
  return responseSchema.parse(data).data
}

export async function uploadPatientEvidence(patientId: string, values: EvidenceUpload): Promise<Evidence> {
  requireApiBaseUrl()
  const form = new FormData()
  form.append('paciente_id', patientId)
  form.append('tipo', values.tipo)
  form.append('archivo', values.archivo)
  if (values.descripcion?.trim()) form.append('descripcion', values.descripcion.trim())
  const { data } = await apiClient.post<unknown>('/evidencias-clinicas', form)
  return z.object({ data: evidenceSchema }).parse(data).data
}

export async function getEvidenceFile(evidenceId: string): Promise<Blob> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<Blob>(`/evidencias-clinicas/${encodeURIComponent(evidenceId)}/archivo`, { responseType: 'blob' })
  return data
}

export async function deleteEvidence(evidenceId: string): Promise<void> {
  requireApiBaseUrl()
  await apiClient.delete(`/evidencias-clinicas/${encodeURIComponent(evidenceId)}`)
}
