import { BarChart3, CalendarClock, CalendarDays, ChevronDown, ClipboardList, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, Pill, Settings, UserRound, UsersRound, Wallet, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/authContext'
import type { UserRole } from '../features/auth/authService'
import { canAccessArea, type RestrictedArea } from '../features/auth/roleAccess'
import { ProtectedPhoto } from '../features/auth/ProtectedPhoto'
import { ProfilePhotoControl } from '../features/auth/ProfilePhotoControl'
import { AccessibleDialog } from '../components/ui/AccessibleDialog'
import { SidebarUserMenu } from './SidebarUserMenu'

type NavItem = { to: string; label: string; icon: LucideIcon; access?: RestrictedArea }

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, access: 'agenda' },
  { to: '/citas-medicas', label: 'Citas médicas', icon: CalendarClock, access: 'agenda' },
  { to: '/actividades', label: 'Actividades', icon: ClipboardList, access: 'actividades' },
  { to: '/caja', label: 'Caja', icon: Wallet, access: 'caja' },
  { to: '/pacientes', label: 'Pacientes', icon: UsersRound, access: 'pacientes' },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, access: 'reportes' },
  { to: '/plantillas-recetas', label: 'Plantillas de recetas', icon: Pill, access: 'recetas' },
  { to: '/usuarios', label: 'Usuarios', icon: UserRound, access: 'usuarios' },
  { to: '/configuracion', label: 'Configuración', icon: Settings, access: 'configuracion' },
]

const roleLabels: Record<UserRole, string> = { doctora: 'Doctora', asistente: 'Asistente', paciente: 'Paciente' }

function Sidebar({ close, compact = false, collapsed = false, toggleCollapse, photoUrl, photoRevision, logoutBusy, onProfile, onLogout }: { close?: () => void; compact?: boolean; collapsed?: boolean; toggleCollapse?: () => void; photoUrl: string | null; photoRevision: number; logoutBusy: boolean; onProfile: (trigger: HTMLButtonElement) => void; onLogout: () => void }) {
  const { user } = useAuth()
  const visibleItems = navItems.filter(({ access }) => !access || canAccessArea(user?.role, access))

  return (
    <div className={`admin-sidebar flex h-full min-h-0 flex-col py-7 ${compact ? 'admin-sidebar-compact px-2' : 'px-4'}`}>
      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={`flex shrink-0 items-center border-b border-sky-200/15 pb-7 ${compact ? 'justify-center' : 'gap-3 px-2'}`}>
        <span aria-hidden="true" className="admin-brand-mark grid size-11 shrink-0 place-items-center rounded-[14px]"><svg viewBox="0 0 64 72" fill="none" className="h-7 w-6"><path d="M32 10C24 10 19 5 12 8 4 11 5 23 8 33c3 11 8 30 13 31 5 1 6-18 11-18s6 19 11 18c5-1 10-20 13-31 3-10 4-22-4-25-7-3-12 2-20 2Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
        {!compact ? <div className="min-w-0">
          <p className="truncate text-[15px] font-bold tracking-tight text-white">Clínica Dental</p>
          <p className="mt-0.5 text-[11px] tracking-wide text-sky-200/80">Historial clínico odontológico</p>
        </div> : null}
        {close ? (
          <button aria-label="Cerrar menú" autoFocus className="admin-interactive ml-auto grid size-11 shrink-0 place-items-center rounded-lg text-sky-100 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" onClick={close} type="button">
            <X aria-hidden="true"/>
          </button>
        ) : null}
      </div>

      {toggleCollapse ? <button aria-controls="desktop-sidebar-navigation" aria-expanded={!collapsed} aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'} className={`admin-interactive mt-4 flex min-h-11 items-center rounded-lg text-sky-100 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${compact ? 'justify-center' : 'gap-3 px-3'}`} data-sidebar-toggle="true" onClick={toggleCollapse} title={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'} type="button">{collapsed ? <PanelLeftOpen aria-hidden="true" size={18}/> : <PanelLeftClose aria-hidden="true" size={18}/>} {!compact ? <span className="text-xs font-medium">{collapsed ? 'Expandir menú' : 'Contraer menú'}</span> : null}</button> : null}

      {!compact ? <p aria-hidden="true" className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200/65">Espacio de trabajo</p> : <span aria-hidden="true" className="mt-4"/>}
      <nav aria-label="Navegación principal" className="space-y-1" id={toggleCollapse ? 'desktop-sidebar-navigation' : undefined}>
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            className={({ isActive }) => `admin-nav-link flex min-h-11 items-center rounded-[10px] text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${compact ? 'justify-center px-2' : 'gap-3 px-3'} ${isActive ? 'font-semibold' : 'text-sky-100/75 hover:bg-white/8 hover:text-white'}`}
            end={to === '/'}
            key={to}
            onClick={close}
            aria-label={compact ? label : undefined}
            title={compact ? label : undefined}
            to={to}
          >
            <Icon aria-hidden="true" className="shrink-0" size={18} strokeWidth={1.7}/><span className={compact ? 'sr-only' : undefined}>{label}</span>
          </NavLink>
        ))}
      </nav>
      </div>
      {user ? <SidebarUserMenu compact={compact} logoutBusy={logoutBusy} onLogout={onLogout} onProfile={onProfile} photoRevision={photoRevision} photoUrl={photoUrl} user={user}/> : null}
    </div>
  )
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [sidebarFocused, setSidebarFocused] = useState(false)
  const [sidebarHoverSuppressed, setSidebarHoverSuppressed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(user?.foto_perfil_url ?? null)
  const [photoRevision, setPhotoRevision] = useState(0)
  const logoutPending = useRef(false)
  const profileTrigger = useRef<HTMLButtonElement | null>(null)
  const headerProfileTrigger = useRef<HTMLButtonElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const title = location.pathname === '/servicios' ? 'Servicios del consultorio' : navItems.find((item) => item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to))?.label ?? 'Expediente clínico'
  const sidebarCompact = sidebarCollapsed && (!sidebarHovered || sidebarHoverSuppressed) && !sidebarFocused
  const dashboard = location.pathname === '/'

  useEffect(() => {
    const onPhoto = (event: Event) => { setPhotoUrl((event as CustomEvent<string | null>).detail); setPhotoRevision((value) => value + 1) }
    window.addEventListener('clinic:profile-photo-changed', onPhoto)
    return () => window.removeEventListener('clinic:profile-photo-changed', onPhoto)
  }, [])

  const closeProfile = () => {
    if (photoBusy || logoutBusy) return
    setProfileOpen(false)
    if (profileTrigger.current && document.contains(profileTrigger.current)) profileTrigger.current.focus()
    else headerProfileTrigger.current?.focus()
  }

  const openProfile = (trigger: HTMLButtonElement) => {
    if (photoBusy || logoutBusy) return
    profileTrigger.current = trigger
    setProfileOpen(true)
  }

  const signOut = async () => {
    if (logoutPending.current) return
    logoutPending.current = true
    setLogoutBusy(true)
    try { await logout() } finally { logoutPending.current = false; setLogoutBusy(false); setProfileOpen(false) }
  }

  const closeMenu = () => {
    setOpen(false)
    menuTriggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open || profileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        menuTriggerRef.current?.focus()
      }
      if (event.key === 'Tab' && drawerRef.current?.getClientRects().length) {
        const controls = [...drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')]
          .filter((control) => control.tabIndex >= 0)
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, profileOpen])

  return (
    <div className={`admin-shell min-h-screen lg:grid ${sidebarCollapsed ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[272px_minmax(0,1fr)]'} ${dashboard ? 'dashboard-shell' : ''} ${sidebarCollapsed ? 'admin-sidebar-collapsed' : ''}`}>
      <aside className={`fixed inset-y-0 left-0 z-30 hidden lg:block ${sidebarCompact ? 'admin-sidebar-compact-width w-[72px]' : dashboard ? 'w-[190px]' : 'w-[272px]'} motion-safe:transition-[width] motion-safe:duration-200`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSidebarFocused(false) }} onFocus={(event) => { if (!(event.target instanceof HTMLElement) || event.target.dataset.sidebarToggle !== 'true') setSidebarFocused(true) }} onMouseEnter={() => setSidebarHovered(true)} onMouseLeave={() => { setSidebarHovered(false); setSidebarHoverSuppressed(false) }} onMouseMove={() => setSidebarHoverSuppressed(false)}><Sidebar collapsed={sidebarCollapsed} compact={sidebarCompact} logoutBusy={logoutBusy} onLogout={() => { void signOut() }} onProfile={openProfile} photoRevision={photoRevision} photoUrl={photoUrl} toggleCollapse={() => { setSidebarCollapsed((value) => !value); setSidebarFocused(false); setSidebarHoverSuppressed(true) }}/></aside>
      {open ? (
        <div aria-label="Menú de navegación" aria-modal="true" className="fixed inset-0 z-40 lg:hidden" ref={drawerRef} role="dialog">
          <button aria-label="Cerrar navegación" className="admin-drawer-backdrop absolute inset-0 bg-[#04112c]/65" onClick={closeMenu} tabIndex={-1} type="button"/>
          <aside className="admin-drawer-panel relative h-full w-[286px] max-w-[85vw] shadow-2xl"><Sidebar close={closeMenu} logoutBusy={logoutBusy} onLogout={() => { void signOut() }} onProfile={openProfile} photoRevision={photoRevision} photoUrl={photoUrl}/></aside>
        </div>
      ) : null}
      <div className="min-w-0 lg:col-start-2">
        <header className="admin-header sticky top-0 z-20 flex min-h-20 items-center px-4 sm:px-7 lg:px-10">
          <button aria-label="Abrir menú" aria-expanded={open} className="admin-interactive mr-3 grid size-11 shrink-0 place-items-center rounded-lg text-[#315a87] hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600 lg:hidden" onClick={() => setOpen(true)} ref={menuTriggerRef} type="button">
            <Menu aria-hidden="true"/>
          </button>
          <div className="min-w-0">
            <p className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-[#647f9f] sm:block">Clínica Dental / Portal clínico</p>
            <p className="truncate text-sm font-bold tracking-tight text-ink-950 sm:mt-1 sm:text-[17px]">{title}</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3 pl-3">
            <span aria-hidden="true" className="h-7 w-px bg-[#d5e3f0]"/>
            {user ? <div className="relative">
              <button aria-expanded={profileOpen} aria-haspopup="dialog" aria-label="Abrir menú de perfil" className="admin-interactive flex min-h-11 items-center gap-2 rounded-lg px-1 text-slate-600 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" onClick={(event) => { if (profileOpen) closeProfile(); else openProfile(event.currentTarget) }} ref={headerProfileTrigger} type="button">
                <ProtectedPhoto className="size-10 rounded-full text-sm font-semibold" key={`${user.id}-${photoRevision}`} name={user.name} photoUrl={photoUrl}/>
                <span className="hidden min-w-0 flex-col text-left text-sm leading-tight sm:flex"><span className="max-w-[12rem] truncate font-medium text-ink-950" title={user.name}>{user.name}</span><span className="text-xs text-slate-500">{roleLabels[user.role]}</span></span><ChevronDown aria-hidden="true" size={16}/>
              </button>
              {profileOpen ? <AccessibleDialog busy={photoBusy || logoutBusy} closeLabel="Cerrar" compact onClose={closeProfile} title="Fotografía de perfil" titleId="profile-photo-title">
                <ProfilePhotoControl initialPhotoUrl={photoUrl} onBusyChange={setPhotoBusy}/>
                <div className="mt-6 border-t border-[#e6edf6] pt-4"><button className="admin-secondary min-h-11 w-full rounded-lg text-sm font-semibold disabled:opacity-60" disabled={photoBusy} onClick={closeProfile} type="button">Volver</button></div>
              </AccessibleDialog> : null}
            </div> : null}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1536px] p-4 sm:p-7 lg:px-10 lg:py-9"><Outlet/></main>
      </div>
    </div>
  )
}
