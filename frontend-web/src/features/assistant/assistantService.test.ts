import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { activateAssistant, changeAssistantPassword, createAssistant, deactivateAssistant, getAssistant } from './assistantService'

const originalBaseURL = apiClient.defaults.baseURL
const assistant = { id: 'assistant-id', name: 'Cuenta recibida', email: 'recibido@backend.test', username: 'recibido', role: 'asistente' as const, activo: true }

afterEach(() => {
  apiClient.defaults.baseURL = originalBaseURL
  vi.restoreAllMocks()
})

describe('assistantService', () => {
  it('requests the confirmed GET path and validates the assistant envelope', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { ...assistant, extra: 'ignored' } } })

    expect(apiClient.getUri({ url: '/usuarios/asistente' })).toBe('https://api.clinica.test/api/usuarios/asistente')
    expect(await getAssistant()).toEqual(assistant)
    expect(get).toHaveBeenCalledWith('/usuarios/asistente')
  })

  it('rejects an invalid assistant response', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const get = vi.spyOn(apiClient, 'get')
    get.mockResolvedValueOnce({ data: { data: { ...assistant, role: 'doctora' } } })
      .mockResolvedValueOnce({ data: { data: { ...assistant, activo: 'true' } } })

    await expect(getAssistant()).rejects.toThrow()
    await expect(getAssistant()).rejects.toThrow()
  })

  it('creates with only the confirmed fields and validates the 201 data', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { data: assistant } })
    const values = { name: 'Cuenta recibida', email: 'recibido@backend.test', username: 'recibido', password: 'clave-confirmada' }

    expect(await createAssistant(values)).toEqual(assistant)
    expect(post).toHaveBeenCalledWith('/usuarios/asistente', values)
  })

  it('sends the existing activation paths without a body', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })

    await deactivateAssistant()
    await activateAssistant()

    expect(post).toHaveBeenNthCalledWith(1, '/usuarios/asistente/desactivar')
    expect(post).toHaveBeenNthCalledWith(2, '/usuarios/asistente/activar')
  })

  it('sends password and password_confirmation only', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    const values = { password: 'clave-confirmada', password_confirmation: 'clave-confirmada' }

    await changeAssistantPassword(values)
    expect(post).toHaveBeenCalledWith('/usuarios/asistente/password', values)
  })

  it('does not send assistant requests without an API base', async () => {
    apiClient.defaults.baseURL = undefined
    const get = vi.spyOn(apiClient, 'get')

    await expect(getAssistant()).rejects.toThrow('VITE_API_BASE_URL')
    expect(get).not.toHaveBeenCalled()
  })
})
