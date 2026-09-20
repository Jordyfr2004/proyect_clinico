import { BarChart3, Boxes, CalendarDays, ChevronDown, CircleHelp, LayoutDashboard, LogOut, Menu, Settings, Stethoscope, UserRound, UsersRound, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard }, { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/pacientes', label: 'Pacientes', icon: UsersRound }, { to: '/inventario', label: 'Inventario', icon: Boxes },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 }, { to: '/usuarios', label: 'Usuarios', icon: UserRound },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
]

function Sidebar({ close }: { close?: () => void }) {
  return <div className="flex h-full flex-col bg-[#f4f8fc] px-3 py-5"><div className="flex h-14 items-center gap-3 px-3"><span className="grid size-10 place-items-center rounded-xl bg-clinic-600 text-white"><Stethoscope size={24}/></span><div><p className="font-bold text-ink-950">Clínica Dental</p><p className="text-xs text-slate-500">Gestión profesional</p></div>{close ? <button aria-label="Cerrar menú" className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-200" onClick={close}><X/></button> : null}</div><nav aria-label="Navegación principal" className="mt-7 space-y-1">{navItems.map(({ to, label, icon: Icon }) => <NavLink className={({ isActive }) => `flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${isActive ? 'bg-clinic-100 text-clinic-700' : 'text-slate-600 hover:bg-white hover:text-slate-950'}`} end={to === '/'} key={to} onClick={close} to={to}><Icon size={19} strokeWidth={1.8}/>{label}</NavLink>)}</nav><div className="mt-auto space-y-1 border-t border-slate-200 pt-4"><button className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-white"><CircleHelp size={19}/>Ayuda</button><NavLink className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-white" to="/login"><LogOut size={19}/>Cerrar sesión</NavLink></div></div>
}

export function AppLayout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const title = navItems.find((item) => item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to))?.label ?? 'Expediente clínico'
  return <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[248px_1fr]"><aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-slate-200 lg:block"><Sidebar/></aside>{open ? <div className="fixed inset-0 z-40 lg:hidden"><button aria-label="Cerrar menú" className="absolute inset-0 bg-slate-950/30" onClick={() => setOpen(false)}/><aside className="relative h-full w-[286px] max-w-[85vw] border-r border-slate-200 shadow-xl"><Sidebar close={() => setOpen(false)}/></aside></div> : null}<div className="min-w-0 lg:col-start-2"><header className="sticky top-0 z-20 flex h-17 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7"><button aria-label="Abrir menú" className="mr-3 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}><Menu/></button><p className="font-semibold text-ink-950">{title}</p><div className="ml-auto flex items-center gap-3"><span className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex"><span className="size-2 rounded-full bg-slate-400"/>Backend no conectado</span><span className="h-7 w-px bg-slate-200"/><button className="flex items-center gap-2 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100" type="button"><span className="grid size-8 place-items-center rounded-full bg-slate-100"><UserRound size={17}/></span><span className="hidden text-sm sm:inline">Cuenta</span><ChevronDown size={14}/></button></div></header><main className="mx-auto w-full max-w-[1500px] p-4 sm:p-7 lg:p-8"><Outlet/></main></div></div>
}
