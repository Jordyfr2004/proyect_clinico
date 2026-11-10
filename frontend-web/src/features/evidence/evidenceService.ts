import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

const evidenceSchema = z.object({
  id: z.string(), paciente_id: z.string(), tipo: z.enum(['caso_clinico', 'rx']),
  nombre_archivo: z.string(), mime_type: z.string(),
  tamano: z.number(), descripcion: z.string().nullable(), fecha: z.string(),
  subido_por: z.object({ id: z.string(), name: z.string(), role: z.string() }).nullable().optional(),
})
const responseSchema = z.object({
  paciente: z.object({ id: z.string(), codigo_paciente: z.string(), nombres: z.string() }),
  data: z.array(evidenceSchema),
})

export type Evidence = z.infer<typeof evidenceSchema>
export type EvidenceType = Evidence['tipo']
export type EvidenceCreateValues = { paciente_id: string; tipo: EvidenceType; archivo: File; descripcion: string | null; fecha: string }
export type EvidenceUpdateValues = { tipo: EvidenceType; descripcion: string | null; fecha: string }

const mutationSchema = z.object({ message: z.string(), data: evidenceSchema })
const messageSchema = z.object({ message: z.string() })

function configured() {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}

export async function getPatientEvidence(patientId: string, signal?: AbortSignal): Promise<Evidence[]> {
  configured()
  const path = `/evidencias-clinicas/paciente/${encodeURIComponent(patientId)}`
  const { data } = signal ? await apiClient.get<unknown>(path, { signal }) : await apiClient.get<unknown>(path)
  return responseSchema.parse(data).data
}

export async function createPatientEvidence(values: EvidenceCreateValues): Promise<string> {
  configured()
  const body = new FormData()
  body.append('paciente_id', values.paciente_id)
  body.append('tipo', values.tipo)
  body.append('archivo', values.archivo)
  body.append('fecha', values.fecha)
  if (values.descripcion !== null) body.append('descripcion', values.descripcion)
  const { data } = await apiClient.post<unknown>('/evidencias-clinicas', body)
  return mutationSchema.parse(data).message
}

export async function updatePatientEvidence(id: string, values: EvidenceUpdateValues): Promise<string> {
  configured()
  const { data } = await apiClient.put<unknown>(`/evidencias-clinicas/${encodeURIComponent(id)}`, values)
  return mutationSchema.parse(data).message
}

export async function deletePatientEvidence(id: string): Promise<string> {
  configured()
  const { data } = await apiClient.delete<unknown>(`/evidencias-clinicas/${encodeURIComponent(id)}`)
  return messageSchema.parse(data).message
}
