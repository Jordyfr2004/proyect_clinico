import { ArrowRight, CalendarDays, ClipboardList, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/states/EmptyState'
import { IntegrationPending } from '../../components/states/IntegrationPending'
import { useAuth } from '../auth/authContext'
import { canAccessArea } from '../auth/roleAccess'

function DataRegion({ type, canViewPatients }: { type: 'appointments' | 'patients'; canViewPatients: boolean }) {
  const appointments = type === 'appointments'
  const columns = appointments
    ? ['Hora', 'Paciente', 'Tratamiento', 'Estado', 'Consultorio', 'Acciones']
    : ['Nombre', 'Última visita', 'Tratamiento', 'Estado', 'Acciones']

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col items-start gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-lg bg-clinic-50 text-clinic-700">
            {appointments ? <CalendarDays size={21}/> : <UsersRound size={21}/>}
          </span>
          <h2 className="text-lg font-semibold tracking-tight text-ink-950">{appointments ? 'Agenda de hoy' : 'Pacientes recientes'}</h2>
        </div>
        {appointments || canViewPatients ? (
          <Link
            className="inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-semibold text-clinic-700 hover:text-clinic-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600"
            to={appointments ? '/agenda' : '/pacientes'}
          >
            {appointments ? 'Ver agenda completa' : 'Ir a pacientes'}<ArrowRight aria-hidden="true" size={15}/>
          </Link>
        ) : null}
      </div>
      <div className={`hidden border-b border-slate-200 bg-slate-50/70 px-6 py-3 text-xs font-semibold text-slate-600 md:grid ${appointments ? 'grid-cols-6' : 'grid-cols-5'}`}>
        {columns.map((column) => <span key={column}>{column}</span>)}
      </div>
      <EmptyState
        description={appointments ? 'Las citas aparecerán aquí cuando exista una integración disponible.' : 'La información clínica aparecerá aquí cuando exista una integración disponible.'}
        icon={appointments ? CalendarDays : ClipboardList}
        title={appointments ? 'No hay citas para mostrar.' : 'No hay pacientes para mostrar.'}
      />
    </section>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const canViewPatients = canAccessArea(user?.role, 'pacientes')

  return (
    <div>
      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(290px,360px)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-[2rem]">Bienvenido</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">Gestiona la actividad clínica y administrativa desde un solo lugar.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-clinic-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-clinic-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" to="/agenda">
              <CalendarDays aria-hidden="true" size={18}/>Ir a la agenda
            </Link>
            {canViewPatients ? (
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-clinic-500 hover:text-clinic-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" to="/pacientes">
                <UsersRound aria-hidden="true" size={18}/>Ir a pacientes
              </Link>
            ) : null}
          </div>
        </div>
        <IntegrationPending/>
      </div>
      <div className="mt-6 grid gap-6">
        <DataRegion canViewPatients={canViewPatients} type="appointments"/>
        <DataRegion canViewPatients={canViewPatients} type="patients"/>
      </div>
    </div>
  )
}
