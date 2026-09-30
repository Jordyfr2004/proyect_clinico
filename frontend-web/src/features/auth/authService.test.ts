import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { getCurrentUser, login, logout } from './authService'

const originalBaseURL = apiClient.defaults.baseURL

afterEach(() => {
  apiClient.defaults.baseURL = originalBaseURL
  vi.restoreAllMocks()
})

describe('authService', () => {
  it('uses the confirmed paths and sends username and password only', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const user = { id: '...', name: '...', username: '...', role: '...', paciente_id: '...' }
    const loginResponse = { message: 'Inicio de sesión correcto.', token_type: 'Bearer' as const, access_token: 'token-confirmado', user }
    const post = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: loginResponse }).mockResolvedValueOnce({ data: null })
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: user })

    expect(apiClient.getUri({ url: '/auth/login' })).toBe('https://api.clinica.test/api/auth/login')
    expect(await login({ username: '1234567890', password: 'valid-password-123' })).toEqual(loginResponse)
    expect(await getCurrentUser()).toEqual(user)
    await logout()

    expect(post).toHaveBeenNthCalledWith(1, '/auth/login', { username: '1234567890', password: 'valid-password-123' })
    expect(get).toHaveBeenCalledWith('/user')
    expect(post).toHaveBeenNthCalledWith(2, '/auth/logout')
  })

  it('does not send authentication requests without a configured API base', async () => {
    apiClient.defaults.baseURL = undefined
    const post = vi.spyOn(apiClient, 'post')

    await expect(login({ username: '1234567890', password: 'valid-password-123' })).rejects.toThrow('VITE_API_BASE_URL')
    expect(post).not.toHaveBeenCalled()
  })
})
