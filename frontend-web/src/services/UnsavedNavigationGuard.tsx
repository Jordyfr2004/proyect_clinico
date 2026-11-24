import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useBlocker } from 'react-router-dom'
import { NavigationGuardContext, UnsavedEditorsContext, type RegisterUnsavedEditor } from './navigationGuardContext'

/** A single blocker covers history Back/Forward and programmatic navigation. */
export function UnsavedNavigationGuard({ children }: { children: ReactNode }) {
  const [editors, setEditors] = useState<Set<symbol>>(() => new Set())
  const register = useCallback<RegisterUnsavedEditor>((id, dirty) => {
    setEditors((current) => {
      if (current.has(id) === dirty) return current
      const next = new Set(current)
      if (dirty) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])
  const blocker = useBlocker(editors.size > 0)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Hay cambios sin guardar. ¿Descartar los cambios y salir?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])
  return <NavigationGuardContext.Provider value={register}><UnsavedEditorsContext.Provider value={editors.size > 0}>{children}</UnsavedEditorsContext.Provider></NavigationGuardContext.Provider>
}
