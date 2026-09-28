import { describe, expect, it, vi } from 'vitest'
import { AUTH_FORBIDDEN_EVENT, AUTH_UNAUTHORIZED_EVENT, createApiClient } from './apiClient'

describe('createApiClient', () => {
  it('uses the configured base URL and sends HTTP-only session cookies', () => {
    const client = createApiClient('https://api.clinica.test')

    expect(client.defaults.baseURL).toBe('https://api.clinica.test')
    expect(client.defaults.withCredentials).toBe(true)
    expect(client.defaults.headers.Accept).toBe('application/json')
  })

  it('keeps the base URL unset while integration is pending', () => {
    const client = createApiClient(undefined)

    expect(client.defaults.baseURL).toBeUndefined()
  })

  it.each([[401, AUTH_UNAUTHORIZED_EVENT], [403, AUTH_FORBIDDEN_EVENT]])('publishes an auth event for a %i response', async (status, eventName) => {
    const listener = vi.fn()
    window.addEventListener(eventName, listener)
    const client = createApiClient(undefined)

    await expect(client.get('/resource', { adapter: () => Promise.reject({ response: { status } }) })).rejects.toBeDefined()

    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener(eventName, listener)
  })
})
