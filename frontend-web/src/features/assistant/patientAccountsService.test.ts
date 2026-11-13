import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { getPatientAccounts } from './patientAccountsService'

const originalBase = apiClient.defaults.baseURL
afterEach(() => { apiClient.defaults.baseURL = originalBase; vi.restoreAllMocks() })

describe('getPatientAccounts', () => {
  it('returns only complete patient results after all Laravel pages arrive', async () => {
    apiClient.defaults.baseURL = 'https://api.test/api'
    const patient = { id: 'user-1', name: 'Cuenta paciente', email: null, username: '0912345678', role: 'paciente', paciente_id: 'patient-1', activo: true, created_at: null }
    const assistant = { ...patient, id: 'user-2', role: 'asistente', paciente_id: null }
    const page = (data: unknown[], current_page: number) => ({ data, current_page, last_page: 2, per_page: 20, total: 3, next_page_url: current_page === 1 ? '/usuarios?page=2' : null, prev_page_url: current_page === 2 ? '/usuarios?page=1' : null })
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: page([patient, assistant], 1) }).mockResolvedValueOnce({ data: page([{ ...patient, id: 'user-3' }], 2) })
    expect(await getPatientAccounts()).toEqual([patient, { ...patient, id: 'user-3' }])
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('stops a superseded paginated scan before requesting another page', async () => {
    apiClient.defaults.baseURL = 'https://api.test/api'
    let finishFirst!: (value: { data: unknown }) => void
    const get = vi.spyOn(apiClient, 'get').mockImplementation(() => new Promise((resolve) => { finishFirst = resolve }))
    const controller = new AbortController()
    const scan = getPatientAccounts('María', controller.signal)
    expect(get).toHaveBeenCalledExactlyOnceWith('/usuarios', { params: { buscar: 'María', page: 1 }, signal: expect.any(AbortSignal) })
    controller.abort()
    finishFirst({ data: { data: [], current_page: 1, last_page: 3, per_page: 20, total: 60, next_page_url: '/usuarios?page=2', prev_page_url: null } })
    await expect(scan).rejects.toMatchObject({ name: 'AbortError' })
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('reads at most three remaining pages concurrently and preserves page order', async () => {
    apiClient.defaults.baseURL = 'https://api.test/api'
    const patient = (id: string) => ({ id, name: id, email: null, username: id, role: 'paciente', paciente_id: id, activo: true, created_at: null })
    const page = (number: number) => ({ data: [patient(`user-${number}`)], current_page: number, last_page: 5, per_page: 20, total: 5, next_page_url: null, prev_page_url: null })
    const finish = new Map<number, (value: { data: unknown }) => void>()
    const get = vi.spyOn(apiClient, 'get').mockImplementation((_url, config) => {
      const number = Number((config?.params as { page?: number } | undefined)?.page)
      return number === 1 ? Promise.resolve({ data: page(1) }) : new Promise((resolve) => { finish.set(number, resolve) })
    })
    const scan = getPatientAccounts()
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(4))
    expect([...finish.keys()]).toEqual([2, 3, 4])
    finish.get(3)!({ data: page(3) })
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(5))
    finish.get(5)!({ data: page(5) })
    finish.get(4)!({ data: page(4) })
    finish.get(2)!({ data: page(2) })
    expect((await scan).map(({ id }) => id)).toEqual(['user-1', 'user-2', 'user-3', 'user-4', 'user-5'])
  })

  it('aborts sibling requests and never returns partial accounts after a failed page', async () => {
    apiClient.defaults.baseURL = 'https://api.test/api'
    const page = (number: number) => ({ data: [], current_page: number, last_page: 4, per_page: 20, total: 80, next_page_url: null, prev_page_url: null })
    const signals: Array<{ aborted: boolean }> = []
    const get = vi.spyOn(apiClient, 'get').mockImplementation((_url, config) => {
      signals.push(config!.signal!)
      const number = Number((config?.params as { page?: number } | undefined)?.page)
      return number === 1 ? Promise.resolve({ data: page(1) }) : number === 2 ? Promise.reject(new Error('page failed')) : new Promise(() => {})
    })
    await expect(getPatientAccounts()).rejects.toThrow('page failed')
    expect(get).toHaveBeenCalledTimes(4)
    expect(signals.every((signal) => signal.aborted)).toBe(true)
  })
})
