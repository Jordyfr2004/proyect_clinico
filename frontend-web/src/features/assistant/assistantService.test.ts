import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { activateAssistant, changeAssistantPassword, createAssistant, deactivateAssistant, deleteAssistant, getAssistant, getAssistants } from './assistantService'

const originalBaseURL = apiClient.defaults.baseURL
const assistant = { id: 'assistant-id', name: 'Cuenta recibida', email: 'recibido@backend.test', username: 'recibido', role: 'asistente' as const, activo: true }

afterEach(() => {
  apiClient.defaults.baseURL = originalBaseURL
  vi.restoreAllMocks()
})

describe('assistantService', () => {
  it('loads the plural assistant list and allows an empty result', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: [assistant, { ...assistant, id: 'second', email: null }] } }).mockResolvedValueOnce({ data: { data: [] } })
    expect(await getAssistants()).toEqual([assistant, { ...assistant, id: 'second', email: null }])
    expect(await getAssistants()).toEqual([])
    expect(get).toHaveBeenCalledWith('/usuarios/asistentes', { signal: undefined })
  })

  it('requests the confirmed GET path and validates the assistant envelope', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { ...assistant, extra: 'ignored' } } })

    expect(apiClient.getUri({ url: '/usuarios/asistentes/assistant-id' })).toBe('https://api.clinica.test/api/usuarios/asistentes/assistant-id')
    expect(await getAssistant(assistant.id)).toEqual(assistant)
    expect(get).toHaveBeenCalledWith('/usuarios/asistentes/assistant-id')
  })

  it('rejects an invalid assistant response', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const get = vi.spyOn(apiClient, 'get')
    get.mockResolvedValueOnce({ data: { data: { ...assistant, role: 'doctora' } } })
      .mockResolvedValueOnce({ data: { data: { ...assistant, activo: 'true' } } })

    await expect(getAssistant(assistant.id)).rejects.toThrow()
    await expect(getAssistant(assistant.id)).rejects.toThrow()
  })

  it('rejects a malformed email returned by the backend', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { ...assistant, email: 'invalid-email' } } })
    await expect(getAssistant(assistant.id)).rejects.toThrow()
  })

  it('creates with only the confirmed fields and validates the 201 data', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { data: assistant } })
    const values = { name: 'Cuenta recibida', email: 'recibido@backend.test', username: 'recibido', password: 'clave-confirmada' }

    expect(await createAssistant(values)).toEqual(assistant)
    expect(post).toHaveBeenCalledWith('/usuarios/asistentes', values)
  })

  it('uses PUT for both assistant status changes without a body', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: null })
    const post = vi.spyOn(apiClient, 'post')

    await deactivateAssistant(assistant.id)
    await activateAssistant(assistant.id)

    expect(put).toHaveBeenNthCalledWith(1, '/usuarios/asistentes/assistant-id/desactivar')
    expect(put).toHaveBeenNthCalledWith(2, '/usuarios/asistentes/assistant-id/activar')
    expect(post).not.toHaveBeenCalled()
  })

  it('uses PUT to send password and password_confirmation only', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: null })
    const post = vi.spyOn(apiClient, 'post')
    const values = { password: 'clave-confirmada', password_confirmation: 'clave-confirmada' }

    await changeAssistantPassword(assistant.id, values)
    expect(put).toHaveBeenCalledExactlyOnceWith('/usuarios/asistentes/assistant-id/password', values)
    expect(post).not.toHaveBeenCalled()
  })

  it('deletes the assistant through the confirmed DELETE path without a body', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const request = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { message: 'Cuenta de asistente eliminada correctamente.' } })
    await deleteAssistant(assistant.id)
    expect(request).toHaveBeenCalledExactlyOnceWith('/usuarios/asistentes/assistant-id')
  })

  it('does not send assistant requests without an API base', async () => {
    apiClient.defaults.baseURL = undefined
    const get = vi.spyOn(apiClient, 'get')

    await expect(getAssistant(assistant.id)).rejects.toThrow('VITE_API_BASE_URL')
    expect(get).not.toHaveBeenCalled()
  })
})
