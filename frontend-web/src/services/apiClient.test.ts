import { describe, expect, it, vi } from 'vitest'
import { AUTH_FORBIDDEN_EVENT, AUTH_UNAUTHORIZED_EVENT, createApiClient } from './apiClient'

describe('createApiClient', () => {
  it('uses the configured API base without cookie credentials', () => {
    const client = createApiClient('https://api.clinica.test')

    expect(client.defaults.baseURL).toBe('https://api.clinica.test')
    expect(client.defaults.withCredentials).not.toBe(true)
    expect(client.defaults.headers.Accept).toBe('application/json')
  })

  it('keeps the base URL unset while integration is pending', () => {
    const client = createApiClient(undefined)

    expect(client.defaults.baseURL).toBeUndefined()
  })

  it.each([[null, undefined], ['token-confirmado', 'Bearer token-confirmado']])('sets Authorization from the current token', async (token, expected) => {
    const client = createApiClient(undefined, () => token)
    let authorization: string | undefined

    await client.get('/resource', { adapter: async (config) => {
      authorization = config.headers.get('Authorization')?.toString()
      return { config, data: null, headers: {}, status: 200, statusText: 'OK' }
    } })

    expect(authorization).toBe(expected)
  })

  it.each([[401, AUTH_UNAUTHORIZED_EVENT], [403, AUTH_FORBIDDEN_EVENT]])('publishes an auth event for a %i response', async (status, eventName) => {
    const listener = vi.fn()
    window.addEventListener(eventName, listener)
    const client = createApiClient(undefined, () => 'token-confirmado')

    await expect(client.get('/resource', { adapter: () => Promise.reject({ response: { status } }) })).rejects.toBeDefined()

    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener(eventName, listener)
  })

  it('does not publish an unauthorized event for a request without a token', async () => {
    const listener = vi.fn()
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener)
    const client = createApiClient(undefined, () => null)

    await expect(client.get('/resource', { adapter: () => Promise.reject({ response: { status: 401 } }) })).rejects.toBeDefined()

    expect(listener).not.toHaveBeenCalled()
    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener)
  })
})
