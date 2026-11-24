import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { getChangeHistory, maskAuditSecrets } from './changeHistoryService'

const baseURL = apiClient.defaults.baseURL
afterEach(() => { vi.restoreAllMocks(); apiClient.defaults.baseURL = baseURL })
describe('change history official contract', () => {
  it('uses only the four accepted filters, validates PostgreSQL rows and masks nested credentials', async () => {
    apiClient.defaults.baseURL = 'https://api.test/api'
    const row = { id: 17, fecha: '2026-11-23T10:00:00-05:00', esquema: 'seguridad', tabla: 'users', operacion: 'DELETE', registro_id: 'removed-user', usuario_id: null, usuario: null, rol: null, campos_modificados: [], datos_anteriores: { name: 'Personal', credentials: { access_token: 'never-render', password: 'private' }, rows: [{ apiKey: 'also-private' }] }, datos_nuevos: null }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { cambios: [row] } })
    const signal = new AbortController().signal
    const filters = { tabla: 'users', registro_id: 'removed-user', fecha: '2026-11-23' }
    const result = await getChangeHistory(filters, signal)
    expect(get).toHaveBeenCalledWith('/configuracion/cambios', { params: filters, signal })
    expect(result[0].datos_nuevos).toBeNull()
    expect(JSON.stringify(result)).not.toMatch(/never-render|private/)
    expect(result[0].datos_anteriores).toMatchObject({ name: 'Personal' })
  })
  it('does not make requests for invalid user UUID or table lengths', async () => {
    apiClient.defaults.baseURL = 'https://api.test/api'
    const get = vi.spyOn(apiClient, 'get')
    await expect(getChangeHistory({ usuario_id: 'invalid' })).rejects.toThrow()
    await expect(getChangeHistory({ tabla: 'x'.repeat(101) })).rejects.toThrow()
    expect(get).not.toHaveBeenCalled()
  })
  it('preserves ordinary JSON and masks token-like text and sensitive array values', () => {
    expect(maskAuditSecrets({ precio: 0, optional: null, password_confirmation: 'secret', nested: ['Bearer abc.def.ghi'], private_key: 'key' })).toEqual({ precio: 0, optional: null, password_confirmation: '[oculto]', nested: ['Bearer [oculto]'], private_key: '[oculto]' })
  })
  it('rejects malformed responses instead of showing an empty history', async () => {
    apiClient.defaults.baseURL = 'https://api.test/api'
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { cambios: [{}] } })
    await expect(getChangeHistory()).rejects.toThrow()
  })
})
