import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { beginClinicalSession, clearClinicalQueries, useClinicalQuery } from './clinicalQuery'

afterEach(() => {
  cleanup()
  clearClinicalQueries()
})

describe('clinical query cache', () => {
  it('shares one in-flight GET and reuses its fresh result on return', async () => {
    const read = vi.fn(async () => 'respuesta recibida')
    const first = renderHook(() => useClinicalQuery(['pacientes', '', 1], read))
    const second = renderHook(() => useClinicalQuery(['pacientes', '', 1], read))
    await waitFor(() => expect(first.result.current.data).toBe('respuesta recibida'))
    expect(second.result.current.data).toBe('respuesta recibida')
    expect(read).toHaveBeenCalledTimes(1)
    first.unmount()
    second.unmount()

    const returned = renderHook(() => useClinicalQuery(['pacientes', '', 1], read))
    expect(returned.result.current.data).toBe('respuesta recibida')
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('drops cached clinical data when the session changes', async () => {
    beginClinicalSession({ id: 'doctor-a', role: 'doctora' })
    const read = vi.fn(async () => 'dato privado')
    const first = renderHook(() => useClinicalQuery(['paciente', '1'], read))
    await waitFor(() => expect(first.result.current.data).toBe('dato privado'))
    first.unmount()
    beginClinicalSession({ id: 'doctor-b', role: 'doctora' })

    const next = renderHook(() => useClinicalQuery(['paciente', '1'], read))
    await waitFor(() => expect(next.result.current.data).toBe('dato privado'))
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('does not send a duplicate GET during development StrictMode remount', async () => {
    const read = vi.fn(async () => 'respuesta')
    const result = renderHook(() => useClinicalQuery(['strict-mode'], read), { wrapper: StrictMode })
    await waitFor(() => expect(result.result.current.data).toBe('respuesta'))
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('aborts an obsolete filter request and displays only the selected filter result', async () => {
    const signals: AbortSignal[] = []
    const finish: Array<(value: string) => void> = []
    const read = vi.fn((signal: AbortSignal) => {
      signals.push(signal)
      return new Promise<string>((resolve) => { finish.push(resolve) })
    })
    const result = renderHook(({ filter }) => useClinicalQuery(['patients', filter], read), { initialProps: { filter: 'old' } })
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1))
    result.rerender({ filter: 'new' })
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2))
    expect(signals[0].aborted).toBe(true)
    expect(result.result.current.data).toBeUndefined()
    finish[0]('stale')
    finish[1]('current')
    await waitFor(() => expect(result.result.current.data).toBe('current'))
  })

  it('hides cached clinical data if Laravel later denies access', async () => {
    const read = vi.fn().mockResolvedValueOnce('private').mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } })
    const result = renderHook(() => useClinicalQuery(['restricted'], read))
    await waitFor(() => expect(result.result.current.data).toBe('private'))
    await act(async () => { await result.result.current.refetch() })
    await waitFor(() => expect(result.result.current.error).toMatchObject({ response: { status: 403 } }))
    expect(result.result.current.data).toBeUndefined()
    expect(result.result.current.isError).toBe(true)
  })
})
