import axios, { type AxiosError } from 'axios'

export const AUTH_UNAUTHORIZED_EVENT = 'clinic:unauthorized'
export const AUTH_FORBIDDEN_EVENT = 'clinic:forbidden'

export function createApiClient(baseURL: string | undefined) {
  const client = axios.create({
    baseURL: baseURL || undefined,
    withCredentials: true,
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  })

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (typeof window !== 'undefined') {
        if (error.response?.status === 401) window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
        if (error.response?.status === 403) window.dispatchEvent(new Event(AUTH_FORBIDDEN_EVENT))
      }
      return Promise.reject(error)
    },
  )

  return client
}

export const apiClient = createApiClient(import.meta.env.VITE_API_BASE_URL)
