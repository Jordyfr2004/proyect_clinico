import { createContext, useContext, useEffect, useRef } from 'react'

export type RegisterUnsavedEditor = (id: symbol, dirty: boolean) => void
export const NavigationGuardContext = createContext<RegisterUnsavedEditor | null>(null)
export const UnsavedEditorsContext = createContext(false)

export function useRegisterUnsavedChanges(dirty: boolean): boolean {
  const register = useContext(NavigationGuardContext)
  const id = useRef(Symbol('clinical-editor'))
  useEffect(() => {
    const editor = id.current
    register?.(editor, dirty)
    return () => register?.(editor, false)
  }, [dirty, register])
  return register !== null
}
