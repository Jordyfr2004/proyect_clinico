import { Camera, ChevronUp, LogOut } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { AuthUser } from '../features/auth/authService'
import { ProtectedPhoto } from '../features/auth/ProtectedPhoto'

const roleLabels = { doctora: 'Doctora', asistente: 'Asistente', paciente: 'Paciente' }

export function SidebarUserMenu({ user, photoUrl, photoRevision, compact, logoutBusy, onProfile, onLogout }: {
  user: AuthUser
  photoUrl: string | null
  photoRevision: number
  compact: boolean
  logoutBusy: boolean
  onProfile: (trigger: HTMLButtonElement) => void
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const first = useRef<HTMLButtonElement>(null)
  const last = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    first.current?.focus()
    const onOutside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', onOutside)
    return () => document.removeEventListener('pointerdown', onOutside)
  }, [open])

  return <div className="relative mt-auto border-t border-sky-200/15 pt-4" onKeyDown={(event) => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); trigger.current?.focus() }
    if (event.key === 'ArrowDown' && open) { event.preventDefault(); (document.activeElement === first.current ? last.current : first.current)?.focus() }
    if (event.key === 'ArrowUp' && open) { event.preventDefault(); (document.activeElement === last.current ? first.current : last.current)?.focus() }
  }} ref={root}>
    {open ? <div aria-label="Opciones de usuario" className="absolute bottom-full left-0 z-50 mb-2 w-60 rounded-xl border border-[#dbe6f2] bg-white p-1.5 text-ink-950 shadow-xl" id={id} role="menu">
      <button className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-clinic-600" onClick={() => { setOpen(false); if (trigger.current) onProfile(trigger.current) }} ref={first} role="menuitem" type="button"><Camera aria-hidden="true" size={17}/>Mi perfil / Cambiar fotografía</button>
      <button className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-clinic-600 disabled:opacity-60" disabled={logoutBusy} onClick={() => { setOpen(false); onLogout() }} ref={last} role="menuitem" type="button"><LogOut aria-hidden="true" size={17}/>{logoutBusy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
    </div> : null}
    <button aria-controls={open ? id : undefined} aria-expanded={open} aria-haspopup="menu" aria-label="Abrir menú de usuario" className={`admin-interactive flex min-h-14 w-full items-center rounded-xl text-left text-sky-100 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${compact ? 'justify-center p-1' : 'gap-3 px-2 py-1'}`} onClick={() => setOpen((value) => !value)} ref={trigger} type="button">
      <ProtectedPhoto className="size-10 rounded-full text-sm font-semibold" key={`${user.id}-${photoRevision}`} name={user.name} photoUrl={photoUrl}/>
      {!compact ? <><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-white">{user.name}</strong><small className="block text-sky-200/80">{roleLabels[user.role]}</small></span><ChevronUp aria-hidden="true" size={16}/></> : null}
    </button>
  </div>
}
