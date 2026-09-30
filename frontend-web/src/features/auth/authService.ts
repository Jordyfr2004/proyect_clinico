import { apiClient } from '../../services/apiClient'
import type { LoginValues } from './loginSchema'

export type AuthUser = {
  id: string
  name: string
  username: string
  role: string
  paciente_id: string
}

export type LoginResponse = {
  message: string
  token_type: 'Bearer'
  access_token: string
  user: AuthUser
}

function requireApiBaseUrl(): void {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}

export async function login(values: LoginValues): Promise<LoginResponse> {
  requireApiBaseUrl()
  const { data } = await apiClient.post<LoginResponse>('/auth/login', values)
  if (!data || data.token_type !== 'Bearer' || typeof data.access_token !== 'string' || !data.access_token || !data.user || typeof data.user !== 'object' || Array.isArray(data.user)) {
    throw new Error('Invalid login response')
  }
  return data
}

export async function getCurrentUser(): Promise<unknown> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/user')
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid current user response')
  return data
}

export async function logout(): Promise<void> {
  requireApiBaseUrl()
  await apiClient.post('/auth/logout')
}
