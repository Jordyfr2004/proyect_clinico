import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

type AuditJson = null | boolean | number | string | AuditJson[] | { [key: string]: AuditJson }
const secretKey = /password|passwd|contrase[nñ]a|token|secret|credential|authorization|cookie|api[_-]?key|private[_-]?key/i

/** Defense in depth: redact before responses enter the in-memory query cache. */
export function maskAuditSecrets(value: AuditJson): AuditJson {
  if (Array.isArray(value)) return value.map(maskAuditSecrets)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, secretKey.test(key) ? '[oculto]' : maskAuditSecrets(item)]))
  if (typeof value === 'string') return value.replace(/Bearer\s+[^\s"']+/gi, 'Bearer [oculto]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[oculto]')
  return value
}

const filterSchema = z.object({
  tabla: z.string().max(100).optional(), registro_id: z.string().max(100).optional(),
  usuario_id: z.uuid().optional(), fecha: z.iso.date().optional(),
})
const changeSchema = z.object({
  id: z.union([z.string(), z.number()]), fecha: z.string(), esquema: z.string(), tabla: z.string(),
  operacion: z.enum(['INSERT', 'UPDATE', 'DELETE']), registro_id: z.string().nullable(),
  usuario_id: z.string().nullable(), usuario: z.string().nullable(), rol: z.string().nullable(),
  campos_modificados: z.array(z.string()),
  datos_anteriores: z.json().transform(maskAuditSecrets), datos_nuevos: z.json().transform(maskAuditSecrets),
})
export type ChangeFilters = z.infer<typeof filterSchema>
export type RecordedChange = z.infer<typeof changeSchema>

export async function getChangeHistory(filters: ChangeFilters = {}, signal?: AbortSignal): Promise<RecordedChange[]> {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
  const params = filterSchema.parse(filters)
  const { data } = await apiClient.get<unknown>('/configuracion/cambios', { params, ...(signal ? { signal } : {}) })
  return z.object({ cambios: z.array(changeSchema).max(200) }).parse(data).cambios
}
