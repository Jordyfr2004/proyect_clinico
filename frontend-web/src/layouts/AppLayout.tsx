import { BarChart3, CalendarDays, LayoutDashboard, LogOut, Menu, Settings, Stethoscope, UserRound, UsersRound, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/authContext'
import type { UserRole } from '../features/auth/authService'
import { canAccessArea, type RestrictedArea } from '../features/auth/roleAccess'

type NavItem = { to: string; label: string; icon: LucideIcon; access?: RestrictedArea }

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/pacientes', label: 'Pacientes', icon: UsersRound, access: 'pacientes' },
  { to: '/mi-perfil', label: 'Mi perfil', icon: UserRound, access: 'mi-perfil' },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/usuarios', label: 'Usuarios', icon: UserRound, access: 'usuarios' },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
]

const roleLabels: Record<UserRole, string> = { doctora: 'Doctora', asistente: 'Asistente', paciente: 'Paciente' }

function Sidebar({ close }: { close?: () => void }) {
  const { logout, user } = useAuth()
  const visibleItems = navItems.filter(({ access }) => !access || canAccessArea(user?.role, access))

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[#f4f8fc] px-3 py-5">
      <div className="flex h-14 shrink-0 items-center gap-3 px-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-clinic-600 text-white"><Stethoscope size={24}/></span>
        <div className="min-w-0">
          <p className="truncate font-bold text-ink-950">Clínica Dental</p>
          <p className="text-xs text-slate-500">Gestión profesional</p>
        </div>
        {close ? (
          <button aria-label="Cerrar menú" autoFocus className="ml-auto grid size-11 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" onClick={close} type="button">
            <X aria-hidden="true"/>
          </button>
        ) : null}
      </div>

      <nav aria-label="Navegación principal" className="mt-7 space-y-1">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600 ${isActive ? 'bg-clinic-100 text-clinic-700' : 'text-slate-600 hover:bg-white hover:text-ink-950'}`}
            end={to === '/'}
            key={to}
            onClick={close}
            to={to}
          >
            <Icon aria-hidden="true" size={19} strokeWidth={1.8}/>{label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-200 pt-4">
        <button className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-white hover:text-ink-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" onClick={() => { close?.(); void logout() }} type="button">
          <LogOut aria-hidden="true" size={19}/>Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export function AppLayout() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const title = navItems.find((item) => item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to))?.label ?? 'Expediente clínico'

  const closeMenu = () => {
    setOpen(false)
    menuTriggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        menuTriggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-slate-200 lg:block"><Sidebar/></aside>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Cerrar navegación" className="absolute inset-0 bg-slate-950/30" onClick={closeMenu} type="button"/>
          <aside className="relative h-full w-[286px] max-w-[85vw] border-r border-slate-200 shadow-xl"><Sidebar close={closeMenu}/></aside>
        </div>
      ) : null}
      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 flex h-17 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
          <button aria-label="Abrir menú" aria-expanded={open} className="mr-3 grid size-11 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600 lg:hidden" onClick={() => setOpen(true)} ref={menuTriggerRef} type="button">
            <Menu aria-hidden="true"/>
          </button>
          <p className="min-w-0 truncate font-semibold text-ink-950">{title}</p>
          <div className="ml-auto flex shrink-0 items-center gap-3 pl-3">
            <span aria-hidden="true" className="h-7 w-px bg-slate-200"/>
            {user ? (
              <div className="flex min-w-0 items-center gap-2 text-slate-600">
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100"><UserRound size={17}/></span>
                <span className="flex min-w-0 flex-col text-sm leading-tight">
                  <span className="max-w-[7rem] truncate font-medium text-ink-950 sm:max-w-[12rem]" title={user.name}>{user.name}</span>
                  <span className="text-xs text-slate-500">{roleLabels[user.role]}</span>
                </span>
              </div>
            ) : null}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-7 lg:p-8"><Outlet/></main>
      </div>
    </div>
  )
}
