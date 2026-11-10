import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { clearClinicalViewState, useClinicalViewState } from './clinicalViewState'

describe('clinical navigation state', () => {
  it('restores a filter after remount and drops it at session end', () => {
    const first = renderHook(() => useClinicalViewState('patients.search', () => ''))
    act(() => first.result.current[1]('María'))
    first.unmount()
    const returned = renderHook(() => useClinicalViewState('patients.search', () => ''))
    expect(returned.result.current[0]).toBe('María')
    returned.unmount()
    clearClinicalViewState()
    const nextSession = renderHook(() => useClinicalViewState('patients.search', () => ''))
    expect(nextSession.result.current[0]).toBe('')
  })
})
