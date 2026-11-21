import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

const categorySchema = z.object({ id: z.string(), nombre: z.string(), activo: z.boolean() })
const serviceSchema = z.object({
  id: z.string(), categoria_id: z.string(), nombre: z.string(), descripcion: z.string(),
  imagen: z.string().nullable(), precio: z.string().nullable(), duracion_minutos: z.number().int().nullable(),
  activo: z.boolean(), categoria: categorySchema.nullable().optional(),
})
const messageSchema = z.object({ message: z.string() })
export type ServiceCategory = z.infer<typeof categorySchema>
export type ConsultingService = z.infer<typeof serviceSchema>
export type ServiceValues = {
  categoria_id: string
  nombre: string
  descripcion: string
  imagen: string | null
  precio: number | null
  duracion_minutos: number | null
}

function configured() {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}
const categoryPath = '/categorias-servicios'
const servicePath = '/servicios-consultorio'
const byId = (path: string, id: string) => `${path}/${encodeURIComponent(id)}`

export async function getCategories(signal?: AbortSignal): Promise<ServiceCategory[]> {
  configured()
  const { data } = signal ? await apiClient.get<unknown>(categoryPath, { signal }) : await apiClient.get<unknown>(categoryPath)
  return z.object({ data: z.array(categorySchema) }).parse(data).data
}
export async function createCategory(nombre: string): Promise<ServiceCategory> {
  configured()
  const { data } = await apiClient.post<unknown>(categoryPath, { nombre })
  return z.object({ message: z.string(), data: categorySchema }).parse(data).data
}
export async function updateCategory(id: string, nombre: string): Promise<ServiceCategory> {
  configured()
  const { data } = await apiClient.put<unknown>(byId(categoryPath, id), { nombre })
  return z.object({ message: z.string(), data: categorySchema }).parse(data).data
}
export async function setCategoryActive(id: string, active: boolean): Promise<ServiceCategory> {
  configured()
  const { data } = await apiClient.put<unknown>(`${byId(categoryPath, id)}/${active ? 'activar' : 'desactivar'}`)
  return z.object({ message: z.string(), data: categorySchema }).parse(data).data
}
export async function getServices(signal?: AbortSignal): Promise<ConsultingService[]> {
  configured()
  const { data } = signal ? await apiClient.get<unknown>(servicePath, { signal }) : await apiClient.get<unknown>(servicePath)
  return z.object({ data: z.array(serviceSchema) }).parse(data).data
}
export async function createService(values: ServiceValues): Promise<ConsultingService> {
  configured()
  const { data } = await apiClient.post<unknown>(servicePath, values)
  return z.object({ message: z.string(), data: serviceSchema }).parse(data).data
}
export async function updateService(id: string, values: ServiceValues): Promise<ConsultingService> {
  configured()
  const { data } = await apiClient.put<unknown>(byId(servicePath, id), values)
  return z.object({ message: z.string(), data: serviceSchema }).parse(data).data
}
export async function setServiceActive(id: string, active: boolean): Promise<ConsultingService> {
  configured()
  const { data } = await apiClient.put<unknown>(`${byId(servicePath, id)}/${active ? 'activar' : 'desactivar'}`)
  return z.object({ message: z.string(), data: serviceSchema }).parse(data).data
}
export async function deleteService(id: string): Promise<string> {
  configured()
  const { data } = await apiClient.delete<unknown>(byId(servicePath, id))
  return messageSchema.parse(data).message
}
