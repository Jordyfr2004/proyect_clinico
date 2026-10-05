import { ArrowRight, ArrowUpRight, CalendarDays, ClipboardList, FileClock, FileText, Settings, ShieldCheck, Stethoscope, UsersRound, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { canAccessArea } from '../auth/roleAccess'

const upcoming = [
  { name: 'Diagnósticos', icon: ClipboardList },
  { name: 'Tratamientos', icon: Stethoscope },
  { name: 'Odontograma', icon: FileClock },
  { name: 'Reportes', icon: FileText, to: '/reportes' },
  { name: 'Recetas', icon: FileText },
  { name: 'Planes y presupuestos', icon: FileText },
] as const

export function DashboardPage() {
  const { user } = useAuth()
  const canViewPatients = canAccessArea(user?.role, 'pacientes')
  const canManageUsers = canAccessArea(user?.role, 'usuarios')
  const canViewAgenda = canAccessArea(user?.role, 'agenda')
  const canViewActivities = canAccessArea(user?.role, 'actividades')
  const canViewCash = canAccessArea(user?.role, 'caja')
  const canViewAudit = canAccessArea(user?.role, 'configuracion')

  return (
    <div className="admin-reveal max-w-[1390px] space-y-8 lg:space-y-10">
      <section className="dashboard-hero rounded-[24px] p-6 sm:p-9 lg:p-11">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-end">
          <div className="min-w-0">
            <p className="dashboard-hero-kicker text-[11px] font-bold uppercase">Portal clínico · Clínica Dental</p>
            <h1 className="mt-5 text-[clamp(2.1rem,4vw,3.3rem)] font-extrabold leading-[1.08] tracking-[-0.05em]">Bienvenido</h1>
            <p className="mt-3 text-lg font-medium text-white">{user?.name ?? 'Equipo clínico'}</p>
            <p className="dashboard-hero-copy mt-4 max-w-xl text-[15px] leading-7">Gestiona pacientes, consulta historiales y administra el acceso asistencial desde las funciones disponibles.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {canViewPatients ? <Link className="admin-primary admin-interactive inline-flex min-h-11 items-center gap-2 rounded-[11px] px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" to="/pacientes">Abrir pacientes <ArrowUpRight aria-hidden="true" size={17}/></Link> : null}
              {canManageUsers ? <Link className="admin-interactive inline-flex min-h-11 items-center rounded-[11px] border border-sky-200/45 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2" to="/usuarios">Gestionar asistente</Link> : null}
            </div>
          </div>
          <div className="dashboard-signal hidden rounded-[18px] p-6 sm:block">
            <span aria-hidden="true" className="grid size-12 place-items-center rounded-xl border border-cyan-200/35 bg-cyan-100/10 text-cyan-100"><Stethoscope size={25} strokeWidth={1.6}/></span>
            <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-200">Espacio de trabajo</p>
            <p className="mt-2 text-lg font-semibold leading-snug text-white">Información clínica organizada para cada consulta.</p>
            <div aria-hidden="true" className="mt-6 flex items-center gap-2"><span className="h-px w-10 bg-cyan-200/70"/><span className="size-1.5 rounded-full bg-cyan-200"/><span className="h-px flex-1 bg-cyan-200/20"/></div>
          </div>
        </div>
      </section>

      <section aria-labelledby="dashboard-modules-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="admin-kicker">Herramientas del portal</p><h2 className="admin-page-title mt-1" id="dashboard-modules-title">Módulos</h2></div>
          <p className="admin-muted text-sm">Disponibilidad según la integración actual</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(290px,.85fr)]">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-ink-950">Disponibles ahora</h3><span className="admin-pill admin-pill-ready">Disponible</span></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {canViewPatients ? <Link className="dashboard-module-card dashboard-module-card-patient admin-reveal flex flex-col justify-between overflow-hidden rounded-[19px] p-5 focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-6" to="/pacientes"><span className="flex items-start justify-between"><UsersRound aria-hidden="true" className="text-[#1269dd]" size={27} strokeWidth={1.6}/><ArrowUpRight aria-hidden="true" className="text-[#2776cc]" size={18}/></span><span className="mt-7"><span className="block text-lg font-bold text-ink-950">Pacientes</span><span className="admin-muted mt-1 block text-sm leading-6">Listado, búsqueda, registro y expediente.</span></span></Link> : null}
              {canViewPatients ? <Link className="dashboard-module-card admin-reveal flex flex-col justify-between overflow-hidden rounded-[19px] p-5 focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-6" to="/pacientes"><span className="flex items-start justify-between"><FileClock aria-hidden="true" className="text-[#1269dd]" size={27} strokeWidth={1.6}/><ArrowUpRight aria-hidden="true" className="text-[#2776cc]" size={18}/></span><span className="mt-7"><span className="block text-lg font-bold text-ink-950">Historial clínico</span><span className="admin-muted mt-1 block text-sm leading-6">Accede desde el expediente de un paciente.</span></span></Link> : null}
              {canViewAgenda ? <Link className="dashboard-module-card admin-reveal flex flex-col justify-between overflow-hidden rounded-[19px] p-5 focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-6" to="/agenda"><span className="flex items-start justify-between"><CalendarDays aria-hidden="true" className="text-[#1269dd]" size={27} strokeWidth={1.6}/><ArrowUpRight aria-hidden="true" className="text-[#2776cc]" size={18}/></span><span className="mt-7"><span className="block text-lg font-bold text-ink-950">Agenda</span><span className="admin-muted mt-1 block text-sm leading-6">Calendario y solicitudes pendientes.</span></span></Link> : null}
              {canViewActivities ? <Link className="dashboard-module-card admin-reveal flex flex-col justify-between overflow-hidden rounded-[19px] p-5 focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-6" to="/actividades"><span className="flex items-start justify-between"><ClipboardList aria-hidden="true" className="text-[#1269dd]" size={27} strokeWidth={1.6}/><ArrowUpRight aria-hidden="true" className="text-[#2776cc]" size={18}/></span><span className="mt-7"><span className="block text-lg font-bold text-ink-950">Actividades</span><span className="admin-muted mt-1 block text-sm leading-6">Consulta de actividades registradas.</span></span></Link> : null}
              {canViewCash ? <Link className="dashboard-module-card admin-reveal flex flex-col justify-between overflow-hidden rounded-[19px] p-5 focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-6" to="/caja"><span className="flex items-start justify-between"><Wallet aria-hidden="true" className="text-[#1269dd]" size={27} strokeWidth={1.6}/><ArrowUpRight aria-hidden="true" className="text-[#2776cc]" size={18}/></span><span className="mt-7"><span className="block text-lg font-bold text-ink-950">Caja</span><span className="admin-muted mt-1 block text-sm leading-6">Resumen y egresos del período.</span></span></Link> : null}
              {canViewAudit ? <Link className="dashboard-module-card admin-reveal flex flex-col justify-between overflow-hidden rounded-[19px] p-5 focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-6" to="/configuracion"><span className="flex items-start justify-between"><Settings aria-hidden="true" className="text-[#1269dd]" size={27} strokeWidth={1.6}/><ArrowUpRight aria-hidden="true" className="text-[#2776cc]" size={18}/></span><span className="mt-7"><span className="block text-lg font-bold text-ink-950">Configuración / Auditoría</span><span className="admin-muted mt-1 block text-sm leading-6">Acciones y sesiones registradas.</span></span></Link> : null}
              {canManageUsers ? <Link className="dashboard-module-card dashboard-module-card-featured admin-reveal flex flex-col justify-between overflow-hidden rounded-[19px] p-5 focus-visible:outline-2 focus-visible:outline-offset-2 sm:col-span-2 sm:p-6" to="/usuarios"><span className="flex items-start justify-between"><ShieldCheck aria-hidden="true" className="text-[#1269dd]" size={27} strokeWidth={1.6}/><ArrowUpRight aria-hidden="true" className="text-[#2776cc]" size={18}/></span><span className="mt-7"><span className="block text-lg font-bold text-ink-950">Usuarios</span><span className="admin-muted mt-1 block text-sm leading-6">Gestiona asistente y cuentas de pacientes.</span></span></Link> : null}
            </div>
          </div>
          <div className="dashboard-pending rounded-[20px] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="admin-kicker">Próximamente</p><h3 className="mt-1 text-lg font-bold text-ink-950">En preparación</h3></div><span className="admin-pill admin-pill-pending">Pendiente</span></div>
            <p className="admin-muted mt-2 text-sm">Diagnóstico, tratamiento y observación se registran desde Agenda. Las vistas independientes y los demás módulos siguen en preparación.</p>
            <ul className="dashboard-pending-list mt-5 grid sm:grid-cols-2 lg:grid-cols-1">
              {upcoming.map(({ name, icon: Icon, ...item }) => <li className="dashboard-pending-item flex min-h-12 items-center gap-3 px-4 text-sm text-[#496483]" key={name}><Icon aria-hidden="true" className="shrink-0 text-[#7094bb]" size={17}/><span className="flex-1">{name}</span>{'to' in item && canAccessArea(user?.role, 'reportes') ? <Link aria-label={`Ver estado de ${name}`} className="grid size-8 place-items-center rounded-md text-[#1269dd] hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-offset-2" to={item.to}><ArrowRight aria-hidden="true" size={16}/></Link> : null}</li>)}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
