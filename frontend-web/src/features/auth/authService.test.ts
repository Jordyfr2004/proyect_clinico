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
    const user = { id: 'user-id', name: 'Doctora', username: 'doctora', role: 'doctora', paciente_id: null, activo: true }
    const loginResponse = { message: 'Inicio de sesión correcto.', token_type: 'Bearer' as const, access_token: 'token-confirmado', user }
    const post = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: { ...loginResponse, user: { ...user, extra_laravel: 'ignored' } } }).mockResolvedValueOnce({ data: null })
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: user })

    expect(apiClient.getUri({ url: '/auth/login' })).toBe('https://api.clinica.test/api/auth/login')
    expect(await login({ username: 'doctora', password: 'valid-password-123' })).toEqual(loginResponse)
    expect(await getCurrentUser()).toEqual(user)
    await logout()

    expect(post).toHaveBeenNthCalledWith(1, '/auth/login', { username: 'doctora', password: 'valid-password-123' })
    expect(get).toHaveBeenCalledWith('/user')
    expect(post).toHaveBeenNthCalledWith(2, '/auth/logout')
  })

  it.each([
    ['doctora', null, true],
    ['asistente', null, false],
    ['paciente', 'patient-id', true],
  ])('restores a %s user and preserves nullable paciente_id and activo', async (role, paciente_id, activo) => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { id: 'user-id', name: 'Usuario', username: 'usuario', role, paciente_id, activo, extra_laravel: 'ignored' } })

    expect(await getCurrentUser()).toEqual({ id: 'user-id', name: 'Usuario', username: 'usuario', role, paciente_id, activo })
  })

  it('rejects an unconfirmed role or missing activo from GET /user', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const get = vi.spyOn(apiClient, 'get')
    get.mockResolvedValueOnce({ data: { id: 'user-id', name: 'Usuario', username: 'usuario', role: 'admin', paciente_id: null, activo: true } })
      .mockResolvedValueOnce({ data: { id: 'user-id', name: 'Usuario', username: 'usuario', role: 'doctora', paciente_id: null } })

    await expect(getCurrentUser()).rejects.toThrow()
    await expect(getCurrentUser()).rejects.toThrow()
  })

  it('does not send authentication requests without a configured API base', async () => {
    apiClient.defaults.baseURL = undefined
    const post = vi.spyOn(apiClient, 'post')

    await expect(login({ username: '1234567890', password: 'valid-password-123' })).rejects.toThrow('VITE_API_BASE_URL')
    expect(post).not.toHaveBeenCalled()
  })

})
