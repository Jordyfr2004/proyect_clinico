import { ArrowRight, CalendarDays, ClipboardList, UserPlus, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/states/EmptyState'
import { IntegrationPending } from '../../components/states/IntegrationPending'

function DataRegion({ type }: { type: 'appointments' | 'patients' }) {
  const appointments = type === 'appointments'
  const columns = appointments ? ['Hora', 'Paciente', 'Tratamiento', 'Estado', 'Consultorio', 'Acciones'] : ['Nombre', 'Última visita', 'Tratamiento', 'Estado', 'Acciones']
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex items-center border-b border-slate-200 px-5 py-4"><div className="flex items-center gap-3"><span className="text-slate-600">{appointments ? <CalendarDays size={21}/> : <UsersRound size={21}/>}</span><h2 className="font-semibold text-ink-950">{appointments ? 'Agenda de hoy' : 'Pacientes recientes'}</h2></div><Link className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-clinic-700 hover:text-clinic-600" to={appointments ? '/agenda' : '/pacientes'}>{appointments ? 'Ver agenda completa' : 'Ir a pacientes'}<ArrowRight size={15}/></Link></div><div className={`hidden border-b border-slate-200 bg-slate-50/70 px-6 py-3 text-xs font-medium text-slate-600 md:grid ${appointments ? 'grid-cols-6' : 'grid-cols-5'}`}>{columns.map((column) => <span key={column}>{column}</span>)}</div><EmptyState description={appointments ? 'Las citas aparecerán aquí cuando exista una integración disponible.' : 'La información clínica aparecerá aquí cuando exista una integración disponible.'} icon={appointments ? CalendarDays : ClipboardList} title={appointments ? 'No hay citas para mostrar.' : 'No hay pacientes para mostrar.'}/></section>
}

export function DashboardPage() {
  return <div><div className="grid gap-6 xl:grid-cols-[1fr_430px]"><div><h1 className="text-3xl font-bold tracking-tight text-ink-950">Bienvenido</h1><p className="mt-2 max-w-2xl leading-7 text-slate-500">Gestiona la actividad clínica y administrativa desde un solo lugar.</p><div className="mt-6 flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-clinic-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-clinic-700" to="/agenda"><CalendarDays size={18}/>Ir a la agenda</Link><Link className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-clinic-500 hover:text-clinic-700" to="/pacientes"><UserPlus size={18}/>Registrar paciente</Link></div></div><IntegrationPending/></div><div className="mt-8 space-y-6"><DataRegion type="appointments"/><DataRegion type="patients"/></div></div>
}
