import { isAxiosError } from 'axios'
import { ArrowRight, CalendarDays, ClipboardList, FileClock, MoreHorizontal, UsersRound, Wallet, type LucideIcon } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useClinicalQuery } from '../../services/clinicalQuery'
import { formatCurrency, formatDate } from '../../utils/displayFormat'
import { getActivities } from '../activities/activityService'
import { getAgendaMonth, getPendingRequests, type AgendaEntry } from '../agenda/agendaService'
import { useAuth } from '../auth/authContext'
import { canAccessArea } from '../auth/roleAccess'
import { getPatients } from '../patients/patientService'
import { getDashboardReport } from '../reports/reportService'

type DataState<T> = { kind: 'loading' } | { kind: 'ready'; data: T; refreshError?: string } | { kind: 'error'; message: string }
function toState<T>(query: { data: T | undefined; isError: boolean; error: Error | null }): DataState<T> {
  if (query.data !== undefined) return { kind: 'ready', data: query.data, ...(query.isError ? { refreshError: errorMessage(query.error) } : {}) }
  if (query.isError) return { kind: 'error', message: errorMessage(query.error) }
  return { kind: 'loading' }
}
const statusLabels: Record<NonNullable<AgendaEntry['estado']>, string> = {
  pendiente: 'Pendiente', programada: 'Programada', cancelada: 'Cancelada', completada: 'Completada',
}
const statusClasses: Record<NonNullable<AgendaEntry['estado']>, string> = {
  pendiente: 'admin-pill-pending', programada: 'admin-pill-ready',
  cancelada: 'admin-pill-cancelled', completada: 'admin-pill-completed',
}

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible comunicarse con el servidor.'
    if ([403, 404, 409, 422].includes(error.response.status)) {
      const message = (error.response.data as { message?: unknown } | undefined)?.message
      if (typeof message === 'string' && message.trim()) return message
    }
  }
  return 'No fue posible cargar esta información.'
}

function MetricCard({ icon: Icon, tone, tag, label, detail, state, value, to, children, onRetry }: {
  icon: LucideIcon
  tone: 'blue' | 'cyan' | 'green' | 'violet'
  tag: string
  label: string
  detail: string
  state: DataState<unknown>
  value: string
  to: string
  children?: ReactNode
  onRetry: () => void
}) {
  return <section aria-label={label} className="dashboard-metric admin-surface min-w-0 rounded-2xl p-4">
    <Link aria-label={`Abrir ${label}`} className="dashboard-metric-link" to={to}/>
    <div className="flex items-start justify-between gap-2"><span aria-hidden="true" className={`dashboard-metric-icon dashboard-tone-${tone}`}><Icon size={19} strokeWidth={1.9}/></span><span className={`dashboard-metric-tag dashboard-tone-${tone}`}>{tag}</span></div>
    {state.kind === 'loading' ? <p className="dashboard-metric-value" role="status">Cargando…</p> : state.kind === 'error' ? <div className="mt-4"><p className="text-sm text-red-700" role="alert">{state.message}</p><button className="dashboard-retry" onClick={onRetry} type="button">Reintentar</button></div> : <><p className="dashboard-metric-value">{value}</p><p className="dashboard-metric-label">{label}</p>{detail ? <p className="dashboard-metric-detail">{detail}</p> : null}{children}{state.refreshError ? <p className="mt-2 text-xs text-red-700" role="alert">No fue posible actualizar. <button className="dashboard-retry" onClick={onRetry} type="button">Reintentar</button></p> : null}</>}
  </section>
}

function PanelState({ state, empty, onRetry }: { state: DataState<unknown>; empty: string; onRetry: () => void }) {
  if (state.kind === 'loading') return <p className="dashboard-panel-message" role="status">Cargando información…</p>
  if (state.kind === 'error') return <div className="dashboard-panel-message"><p className="text-red-700" role="alert">{state.message}</p><button className="dashboard-retry" onClick={onRetry} type="button">Reintentar</button></div>
  if (state.refreshError) return <div className="dashboard-panel-message"><p className="text-red-700" role="alert">No fue posible actualizar esta información.</p><button className="dashboard-retry" onClick={onRetry} type="button">Reintentar</button></div>
  return <p className="dashboard-panel-message">{empty}</p>
}

function todayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function patientInitials(name: string | undefined): string {
  return name?.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toLocaleUpperCase('es') || '—'
}

export function DashboardPage() {
  const { user } = useAuth()
  const canViewPatients = canAccessArea(user?.role, 'pacientes')
  const canViewAgenda = canAccessArea(user?.role, 'agenda')
  const canViewActivities = canAccessArea(user?.role, 'actividades')
  const canViewCash = canAccessArea(user?.role, 'caja')
  const [today] = useState(() => new Date())
  const month = today.getMonth() + 1
  const year = today.getFullYear()
  const agendaQuery = useClinicalQuery(['agenda', month, year], (signal) => getAgendaMonth(month, year, signal), { enabled: canViewAgenda })
  const pendingQuery = useClinicalQuery(['agenda', 'pending'], getPendingRequests, { enabled: canViewAgenda })
  const patientsQuery = useClinicalQuery(['patients', '', 1], (signal) => getPatients({}, signal), { enabled: canViewPatients && !canViewCash })
  const reportQuery = useClinicalQuery(['dashboard-report'], getDashboardReport, { enabled: canViewCash })
  const activitiesQuery = useClinicalQuery(['activities', { mes: month, anio: year }], (signal) => getActivities({ mes: month, anio: year }, signal), { enabled: canViewActivities })
  const data = { agenda: toState(agendaQuery), pending: toState(pendingQuery), patients: toState(patientsQuery), report: toState(reportQuery), activities: toState(activitiesQuery) }

  const appointments = useMemo(() => agendaQuery.data
    ? agendaQuery.data.filter((entry) => entry.tipo === 'cita_medica' && entry.fecha?.slice(0, 10) === todayKey(today)).sort((a, b) => (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? ''))
    : [], [agendaQuery.data, today])
  const pendingRequests = useMemo(() => pendingQuery.data
    ? pendingQuery.data.filter((entry) => entry.tipo === 'cita_medica' && entry.estado === 'pendiente')
    : [], [pendingQuery.data])
  const quickLinks = [
    ...(canViewPatients ? [
      { to: '/pacientes', label: 'Pacientes', detail: 'Listado y registro', icon: UsersRound, tone: 'blue' },
      { to: '/pacientes', label: 'Historial clínico', detail: 'Desde el expediente', icon: FileClock, tone: 'green' },
    ] : []),
    ...(canViewAgenda ? [{ to: '/citas-medicas', label: 'Citas médicas', detail: 'Consulta y gestión', icon: CalendarDays, tone: 'cyan' }] : []),
    ...(canViewActivities ? [{ to: '/actividades', label: 'Actividades', detail: 'Registros del consultorio', icon: ClipboardList, tone: 'violet' }] : []),
  ] as const

  return <div className="dashboard-screen admin-reveal">
    <div className="dashboard-intro"><p className="dashboard-eyebrow">Panel clínico</p><h1>Resumen de gestión</h1><p>Consulta la actividad del consultorio y las tareas pendientes.</p></div>

    <div className="dashboard-metrics">
      {canViewAgenda ? <MetricCard detail="Citas programadas para hoy" icon={CalendarDays} label="Citas médicas" onRetry={() => { void (canViewCash ? reportQuery : agendaQuery).refetch() }} state={canViewCash ? data.report : data.agenda} tag="Hoy" to="/citas-medicas" tone="blue" value={canViewCash ? data.report.kind === 'ready' ? String(data.report.data.citas.hoy) : '' : data.agenda.kind === 'ready' ? String(appointments.length) : ''}/> : null}
      {canViewPatients ? <MetricCard detail="Pacientes registrados en el sistema" icon={UsersRound} label="Pacientes registrados" onRetry={() => { void (canViewCash ? reportQuery : patientsQuery).refetch() }} state={canViewCash ? data.report : data.patients} tag="Total" to="/pacientes" tone="cyan" value={canViewCash ? data.report.kind === 'ready' ? String(data.report.data.pacientes.total) : '' : data.patients.kind === 'ready' ? String(data.patients.data.total) : ''}/> : null}
      {canViewCash ? <MetricCard detail="" icon={Wallet} label="Ingresos y egresos" onRetry={() => { void reportQuery.refetch() }} state={data.report} tag="Este mes" to="/caja" tone="green" value={data.report.kind === 'ready' ? formatCurrency(data.report.data.mes_actual.saldo) : ''}>{data.report.kind === 'ready' ? <p className="dashboard-metric-detail dashboard-money-line">Ingresos: {formatCurrency(data.report.data.mes_actual.ingresos)} <span aria-hidden="true">|</span> Egresos: {formatCurrency(data.report.data.mes_actual.egresos)}</p> : null}</MetricCard> : null}
      {canViewActivities ? <MetricCard detail="Actividades registradas en el mes actual" icon={ClipboardList} label="Actividades" onRetry={() => { void activitiesQuery.refetch() }} state={data.activities} tag="Este mes" to="/actividades" tone="violet" value={data.activities.kind === 'ready' ? String(data.activities.data.length) : ''}/> : null}
    </div>

    <div className={`dashboard-content ${canViewAgenda ? '' : 'dashboard-content-single'}`}>
      {canViewAgenda ? <section aria-labelledby="dashboard-agenda-title" className="dashboard-panel dashboard-agenda admin-surface">
        <div className="dashboard-panel-head"><div><h2 id="dashboard-agenda-title">Agenda de hoy</h2><p>{formatDate(todayKey(today))}</p></div><Link className="dashboard-panel-link" to="/agenda">Ver agenda completa <ArrowRight aria-hidden="true" size={14}/></Link></div>
        {data.agenda.kind === 'ready' && appointments.length ? <div className="dashboard-agenda-list"><div aria-hidden="true" className="dashboard-agenda-labels"><span>Paciente</span><span>Hora</span><span>Motivo / descripción</span><span>Estado</span><span>Acción</span></div><ul>{appointments.map((entry) => <li className="dashboard-agenda-row" key={entry.id}><div className="dashboard-agenda-patient"><span aria-hidden="true" className="dashboard-patient-avatar">{patientInitials(entry.paciente?.nombres)}</span><span className="min-w-0"><strong>{entry.paciente?.nombres ?? 'Paciente no disponible'}</strong>{entry.paciente?.codigo_paciente ? <small>{entry.paciente.codigo_paciente}</small> : null}</span></div><time>{entry.hora_inicio?.slice(0, 5) ?? 'Sin hora'}</time><p className="dashboard-agenda-description">{entry.descripcion ?? 'Sin descripción'}</p><span>{entry.estado ? <span className={`admin-pill ${statusClasses[entry.estado]}`}>{statusLabels[entry.estado]}</span> : 'Sin estado'}</span><Link aria-label={`Ver cita de ${entry.paciente?.nombres ?? 'paciente no disponible'}`} className="dashboard-row-action" to="/citas-medicas"><MoreHorizontal aria-hidden="true" size={17}/></Link></li>)}</ul></div> : <PanelState empty="No hay citas médicas registradas para hoy." onRetry={() => { void agendaQuery.refetch() }} state={data.agenda}/>}
      </section> : null}

      <div className="dashboard-side">
        <section aria-labelledby="dashboard-quick-title" className="dashboard-panel dashboard-quick admin-surface"><div className="dashboard-panel-head"><h2 id="dashboard-quick-title">Accesos rápidos</h2></div><div className="dashboard-quick-grid">{quickLinks.map(({ to, label, detail, icon: Icon, tone }) => <Link className="dashboard-quick-link" key={label} to={to}><span aria-hidden="true" className={`dashboard-quick-icon dashboard-tone-${tone}`}><Icon size={18} strokeWidth={1.8}/></span><strong>{label}</strong><small>{detail}</small></Link>)}</div></section>
        {canViewAgenda ? <section aria-labelledby="dashboard-pending-title" className="dashboard-panel dashboard-requests admin-surface"><div className="dashboard-panel-head"><h2 id="dashboard-pending-title">Solicitudes pendientes</h2><Link className="dashboard-panel-link" to="/citas-medicas">Ver citas médicas <ArrowRight aria-hidden="true" size={14}/></Link></div>{data.pending.kind === 'ready' && pendingRequests.length ? <ul className="dashboard-request-list">{pendingRequests.map((entry) => <li key={entry.id}><span className="dashboard-request-name">{entry.paciente?.nombres ?? 'Paciente no disponible'}</span>{entry.paciente?.codigo_paciente ? <small>{entry.paciente.codigo_paciente}</small> : null}<span className="admin-pill admin-pill-pending">Pendiente</span></li>)}</ul> : <PanelState empty="No hay solicitudes de citas pendientes." onRetry={() => { void pendingQuery.refetch() }} state={data.pending}/>}</section> : null}
      </div>
    </div>
  </div>
}
