import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

// Navigation context is kept in memory for this session, never in URLs or browser storage.
const viewState = new Map<string, unknown>()

export function useClinicalViewState<T>(key: string, initial: () => T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => viewState.has(key) ? viewState.get(key) as T : initial())
  useEffect(() => { viewState.set(key, value) }, [key, value])
  return [value, setValue]
}

export function clearClinicalViewState(): void {
  viewState.clear()
}
