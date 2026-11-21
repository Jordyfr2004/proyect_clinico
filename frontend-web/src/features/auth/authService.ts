import { z } from 'zod'
import { apiClient } from '../../services/apiClient'
import type { LoginValues } from './loginSchema'

const authUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  email: z.string().nullable().optional(),
  role: z.enum(['doctora', 'asistente', 'paciente']),
  paciente_id: z.string().nullable(),
  activo: z.boolean(),
  foto_perfil_url: z.string().nullable().optional(),
})

export type UserRole = z.infer<typeof authUserSchema.shape.role>
export type AuthUser = z.infer<typeof authUserSchema>

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
  return parseAuthResponse(data)
}

function parseAuthResponse(data: LoginResponse): LoginResponse {
  if (!data || data.token_type !== 'Bearer' || typeof data.access_token !== 'string' || !data.access_token || !data.user || typeof data.user !== 'object' || Array.isArray(data.user)) {
    throw new Error('Invalid login response')
  }
  return { ...data, user: authUserSchema.parse(data.user) }
}

export async function getCurrentUser(): Promise<AuthUser> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/user')
  return authUserSchema.parse(data)
}

export async function logout(): Promise<void> {
  requireApiBaseUrl()
  await apiClient.post('/auth/logout')
}

const recoveryMessageSchema = z.object({ message: z.string() })

export async function requestPasswordReset(email: string): Promise<string> {
  requireApiBaseUrl()
  const { data } = await apiClient.post<unknown>('/auth/forgot-password', { email })
  return recoveryMessageSchema.parse(data).message
}

export async function resetPassword(values: { email: string; code: string; password: string; password_confirmation: string }): Promise<string> {
  requireApiBaseUrl()
  const { data } = await apiClient.post<unknown>('/auth/reset-password', values)
  return recoveryMessageSchema.parse(data).message
}
