import axios, { type AxiosError } from 'axios'
import { getAccessToken } from '../features/auth/authStorage'

export const AUTH_UNAUTHORIZED_EVENT = 'clinic:unauthorized'
export const AUTH_FORBIDDEN_EVENT = 'clinic:forbidden'

export function createApiClient(baseURL: string | undefined, readToken: () => string | null = getAccessToken) {
  const client = axios.create({
    baseURL: baseURL || undefined,
    headers: { Accept: 'application/json' },
  })

  client.interceptors.request.use((config) => {
    const token = readToken()
    if (token) config.headers.set('Authorization', `Bearer ${token}`)
    else config.headers.delete('Authorization')
    return config
  })

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (typeof window !== 'undefined') {
        if (error.response?.status === 401 && readToken()) window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
        if (error.response?.status === 403) window.dispatchEvent(new Event(AUTH_FORBIDDEN_EVENT))
      }
      return Promise.reject(error)
    },
  )

  return client
}

export const apiClient = createApiClient(import.meta.env.VITE_API_BASE_URL)
