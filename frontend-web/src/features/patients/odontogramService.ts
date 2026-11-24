import { z } from 'zod'
import { apiClient } from '../../services/apiClient'
export type JsonObject = { [key: string]: z.infer<ReturnType<typeof z.json>> }
export type ToothDraft = { condition: 'sano' | 'caries' | 'restauracion' | 'ausente' | 'pendiente'; note: string }
const jsonData = z.union([z.record(z.string(), z.json()), z.array(z.json())])
const chartSchema = z.object({ id: z.string().min(1), paciente_id: z.string().min(1), datos: jsonData })
export type Odontogram = z.infer<typeof chartSchema>
const object = (value: unknown): value is JsonObject => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const toothSchema = z.object({ condition: z.enum(['sano','caries','restauracion','ausente','pendiente']), note: z.string() })
export function chartEditable(data: Odontogram['datos']): data is JsonObject {
 if (!object(data)) return false
 const namespace = data.frontend_web_v1
 if (namespace === undefined) return true
 if (!object(namespace) || (namespace.teeth !== undefined && !object(namespace.teeth))) return false
 return Object.values(namespace.teeth ?? {}).every((value) => toothSchema.safeParse(value).success)
}
export function toothDrafts(data: Odontogram['datos']): Record<number, ToothDraft> {
 if (!chartEditable(data)) return {}
 const namespace = data.frontend_web_v1
 if (!object(namespace) || !object(namespace.teeth)) return {}
 return Object.fromEntries(Object.entries(namespace.teeth).flatMap(([key, value]) => { const parsed = toothSchema.safeParse(value); return parsed.success ? [[key, parsed.data]] : [] }))
}
export function mergeTooth(data: JsonObject, tooth: number, change: ToothDraft): JsonObject {
 if (!chartEditable(data)) throw new Error('Formato de odontograma no editable')
 const namespace = object(data.frontend_web_v1) ? data.frontend_web_v1 : {}
 const teeth = object(namespace.teeth) ? namespace.teeth : {}
 return { ...data, frontend_web_v1: { ...namespace, teeth: { ...teeth, [tooth]: { ...(object(teeth[tooth]) ? teeth[tooth] : {}), ...change } } } }
}
function path(id: string) { if (!apiClient.defaults.baseURL) throw new Error('API no configurada'); return `/odontogramas/paciente/${encodeURIComponent(id)}` }
export async function getOdontogram(patientId: string, signal?: AbortSignal): Promise<Odontogram | null> {
 const { data } = await apiClient.get<unknown>(path(patientId), { ...(signal ? { signal } : {}) })
 const response = z.object({ paciente: z.object({ id: z.literal(patientId) }), odontograma: chartSchema.nullable() }).parse(data)
 if (response.odontograma && response.odontograma.paciente_id !== patientId) throw new Error('Paciente no coincide')
 return response.odontograma
}
export async function saveOdontogram(patientId: string, datos: JsonObject): Promise<Odontogram> {
 const { data } = await apiClient.put<unknown>(path(patientId), { datos })
 const chart = z.object({ data: chartSchema.extend({ paciente_id: z.literal(patientId) }) }).parse(data).data
 return chart
}
export async function deleteOdontogram(patientId: string): Promise<string> {
 const { data } = await apiClient.delete<unknown>(path(patientId))
 return z.object({ message: z.string() }).parse(data).message
}
