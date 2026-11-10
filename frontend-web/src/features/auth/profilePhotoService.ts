import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

const photoResponseSchema = z.object({ data: z.object({ foto_perfil_url: z.string().nullable() }) })
function configured() {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}

export async function getProfilePhoto(userId: string, signal?: AbortSignal): Promise<Blob> {
  configured()
  const { data } = await apiClient.get<Blob>(`/usuarios/${encodeURIComponent(userId)}/foto`, { responseType: 'blob', ...(signal ? { signal } : {}) })
  return data
}

export async function uploadProfilePhoto(file: File): Promise<string | null> {
  configured()
  const body = new FormData()
  body.append('foto', file)
  const { data } = await apiClient.post<unknown>('/perfil/foto', body)
  return photoResponseSchema.parse(data).data.foto_perfil_url
}

export async function deleteProfilePhoto(): Promise<string | null> {
  configured()
  const { data } = await apiClient.delete<unknown>('/perfil/foto')
  return photoResponseSchema.parse(data).data.foto_perfil_url
}
