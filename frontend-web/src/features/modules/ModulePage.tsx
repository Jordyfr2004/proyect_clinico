import type { LucideIcon } from 'lucide-react'
import { CalendarDays, FileBarChart, Settings, UserRound, UsersRound } from 'lucide-react'
import { EmptyState } from '../../components/states/EmptyState'
import { IntegrationPending } from '../../components/states/IntegrationPending'

type ModuleKey = 'agenda' | 'pacientes' | 'reportes' | 'usuarios' | 'configuracion'
type PendingModule = Exclude<ModuleKey, 'usuarios'>

const modules: Record<ModuleKey, { title: string; description: string }> = {
  agenda: { title: 'Agenda', description: 'Organiza citas, disponibilidad y lista de espera.' },
  pacientes: { title: 'Pacientes', description: 'Consulta y administra expedientes clínicos.' },
  reportes: { title: 'Reportes', description: 'Consulta información clínica, operativa y financiera.' },
  usuarios: { title: 'Usuarios', description: 'Gestiona la cuenta de acceso del personal asistencial.' },
  configuracion: { title: 'Configuración', description: 'Define horarios, disponibilidad y parámetros de la clínica.' },
}

const emptyStates: Record<PendingModule, { title: string; description: string; icon: LucideIcon }> = {
  agenda: { title: 'No hay citas para mostrar.', description: 'Las citas se mostrarán cuando el servicio de agenda esté disponible.', icon: CalendarDays },
  pacientes: { title: 'No hay pacientes registrados.', description: 'Los pacientes se mostrarán cuando el backend publique el servicio correspondiente.', icon: UsersRound },
  reportes: { title: 'No hay reportes disponibles.', description: 'Los reportes requieren fuentes de datos reales del backend.', icon: FileBarChart },
  configuracion: { title: 'Configuración no disponible.', description: 'Los horarios y parámetros se habilitarán con su contrato de backend.', icon: Settings },
}

export function ModulePage({ module }: { module: ModuleKey }) {
  const current = modules[module]

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-[2rem]">{current.title}</h1>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600">{current.description}</p>
        </div>
        {module === 'pacientes' ? (
          <button className="min-h-11 w-fit shrink-0 rounded-lg border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed" disabled title="Disponible al integrar el backend" type="button">
            Registrar paciente
          </button>
        ) : null}
      </div>

      <div className="mt-6"><IntegrationPending compact/></div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {module === 'usuarios' ? (
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:p-8">
            <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl bg-clinic-50 text-clinic-700"><UserRound size={25}/></span>
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold tracking-tight text-ink-950">Cuenta de asistente</h2>
              <p className="mt-2 leading-7 text-slate-600">La clínica utiliza una única cuenta con rol asistente.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">La gestión estará disponible cuando el backend publique el contrato completo.</p>
            </div>
          </div>
        ) : (
          <EmptyState description={emptyStates[module].description} icon={emptyStates[module].icon} title={emptyStates[module].title}/>
        )}
      </section>
    </div>
  )
}
