import type { LucideIcon } from 'lucide-react'
import { CalendarDays, FileBarChart, Settings } from 'lucide-react'
import { EmptyState } from '../../components/states/EmptyState'
import { IntegrationPending } from '../../components/states/IntegrationPending'

type ModuleKey = 'agenda' | 'reportes' | 'configuracion'

const modules: Record<ModuleKey, { title: string; description: string }> = {
  agenda: { title: 'Agenda', description: 'Organiza citas, disponibilidad y lista de espera.' },
  reportes: { title: 'Reportes', description: 'Consulta información clínica, operativa y financiera.' },
  configuracion: { title: 'Configuración', description: 'Define horarios, disponibilidad y parámetros de la clínica.' },
}

const emptyStates: Record<ModuleKey, { title: string; description: string; icon: LucideIcon }> = {
  agenda: { title: 'No hay citas para mostrar.', description: 'Las citas se mostrarán cuando el servicio de agenda esté disponible.', icon: CalendarDays },
  reportes: { title: 'No hay reportes disponibles.', description: 'Los reportes requieren fuentes de datos reales del backend.', icon: FileBarChart },
  configuracion: { title: 'Configuración no disponible.', description: 'Los horarios y parámetros se habilitarán con su contrato de backend.', icon: Settings },
}

export function ModulePage({ module }: { module: ModuleKey }) {
  const current = modules[module]

  return (
    <div className="max-w-6xl">
      <div className="border-b border-slate-200 pb-7">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-[2rem]">{current.title}</h1>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600">{current.description}</p>
        </div>
      </div>

      <div className="mt-6"><IntegrationPending compact/></div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <EmptyState description={emptyStates[module].description} icon={emptyStates[module].icon} title={emptyStates[module].title}/>
      </section>
    </div>
  )
}
