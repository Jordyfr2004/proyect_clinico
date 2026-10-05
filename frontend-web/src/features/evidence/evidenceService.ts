import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

const evidenceSchema = z.object({
  id: z.string(), paciente_id: z.string(), tipo: z.enum(['caso_clinico', 'rx']),
  nombre_archivo: z.string(), ruta_archivo: z.string(), mime_type: z.string(),
  tamano: z.number(), descripcion: z.string().nullable(), fecha: z.string(),
})
const responseSchema = z.object({
  paciente: z.object({ id: z.string(), codigo_paciente: z.string(), nombres: z.string() }),
  data: z.array(evidenceSchema),
})

export type Evidence = z.infer<typeof evidenceSchema>

export async function getPatientEvidence(patientId: string): Promise<Evidence[]> {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
  const { data } = await apiClient.get<unknown>(`/evidencias-clinicas/paciente/${encodeURIComponent(patientId)}`)
  return responseSchema.parse(data).data
}
