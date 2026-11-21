import { z } from 'zod'
import { apiClient } from '../../services/apiClient'
import { paginatedSchema } from '../../services/pagination'

const accountSchema = z.object({
  id: z.string(), name: z.string(), email: z.string().nullable(), username: z.string(),
  role: z.enum(['doctora', 'asistente', 'paciente']), paciente_id: z.string().nullable(),
  activo: z.boolean(), created_at: z.string().nullable(),
  foto_perfil_url: z.string().nullable().optional(),
})
export type Account = z.infer<typeof accountSchema>

function requireApiBaseUrl() {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}

export async function getPatientAccounts(buscar = '', signal?: AbortSignal): Promise<Account[]> {
  requireApiBaseUrl()
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  if (signal?.aborted) controller.abort()
  const readPage = async (pageNumber: number) => {
    controller.signal.throwIfAborted()
    const { data } = await apiClient.get<unknown>('/usuarios', { params: { ...(buscar.trim() ? { buscar: buscar.trim() } : {}), page: pageNumber }, signal: controller.signal })
    const page = paginatedSchema(accountSchema).parse(data)
    if (page.current_page !== pageNumber) throw new Error('La paginación de usuarios no coincide con la página solicitada.')
    return page
  }
  try {
    const first = await readPage(1)
    const pages: Account[][] = [first.data.filter((account) => account.role === 'paciente')]
    let nextPage = 2
    const workers = Array.from({ length: Math.min(3, first.last_page - 1) }, async () => {
      while (nextPage <= first.last_page) {
        const pageNumber = nextPage++
        try {
          const page = await readPage(pageNumber)
          if (page.last_page !== first.last_page) throw new Error('La paginación de usuarios cambió durante la consulta. Vuelve a intentarlo.')
          pages[pageNumber - 1] = page.data.filter((account) => account.role === 'paciente')
        } catch (error) { controller.abort(); throw error }
      }
    })
    await Promise.all(workers)
    controller.signal.throwIfAborted()
    return pages.flat()
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }
}

async function updateAccount(id: string, action: 'activar' | 'desactivar' | 'desvincular-paciente'): Promise<string> {
  requireApiBaseUrl()
  const { data } = await apiClient.put<unknown>(`/usuarios/${encodeURIComponent(id)}/${action}`)
  return z.object({ message: z.string(), data: accountSchema.pick({ id: true, role: true, paciente_id: true, activo: true }).passthrough() }).parse(data).message
}

export const activatePatientAccount = (id: string) => updateAccount(id, 'activar')
export const deactivatePatientAccount = (id: string) => updateAccount(id, 'desactivar')
export const unlinkPatientAccount = (id: string) => updateAccount(id, 'desvincular-paciente')
