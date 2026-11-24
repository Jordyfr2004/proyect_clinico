import { useEffect } from 'react'
import { useRegisterUnsavedChanges } from '../../services/navigationGuardContext'
// Protect unload and navigation; use the app router blocker when available.
export function useClinicalUnsavedChanges(dirty: boolean) {
 const managed = useRegisterUnsavedChanges(dirty)
 useEffect(() => {
  if (!dirty) return
  const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
  const navigate = (event: MouseEvent) => {
   if (managed) return
   const target = event.target instanceof Element ? event.target.closest('a[href],button[data-clinical-navigation]') : null
   if (!target || (target instanceof HTMLAnchorElement && (target.target === '_blank' || target.hasAttribute('download')))) return
   if (!window.confirm('Hay cambios sin guardar. ¿Descartar los cambios y salir?')) { event.preventDefault(); event.stopPropagation() }
  }
  window.addEventListener('beforeunload', unload)
  document.addEventListener('click', navigate, true)
  return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true) }
 }, [dirty, managed])
}
