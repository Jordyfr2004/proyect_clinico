import type { LucideIcon } from 'lucide-react'
import { Boxes, CalendarDays, FileBarChart, Settings, ShieldCheck, UsersRound } from 'lucide-react'
import { EmptyState } from '../../components/states/EmptyState'
import { IntegrationPending } from '../../components/states/IntegrationPending'

type ModuleKey = 'agenda' | 'pacientes' | 'inventario' | 'reportes' | 'usuarios' | 'configuracion'
type ModuleDefinition = { title: string; description: string; emptyTitle: string; emptyDescription: string; icon: LucideIcon }
const modules: Record<ModuleKey, ModuleDefinition> = {
  agenda: { title: 'Agenda', description: 'Organiza citas, disponibilidad y lista de espera.', emptyTitle: 'No hay citas para mostrar.', emptyDescription: 'Las citas se mostrarán cuando el servicio de agenda esté disponible.', icon: CalendarDays },
  pacientes: { title: 'Pacientes', description: 'Consulta y administra expedientes clínicos.', emptyTitle: 'No hay pacientes registrados.', emptyDescription: 'Los pacientes se mostrarán cuando el backend publique el servicio correspondiente.', icon: UsersRound },
  inventario: { title: 'Inventario', description: 'Controla insumos odontológicos y niveles de stock.', emptyTitle: 'No hay insumos para mostrar.', emptyDescription: 'El inventario aparecerá cuando su contrato de API esté disponible.', icon: Boxes },
  reportes: { title: 'Reportes', description: 'Consulta información clínica, operativa y financiera.', emptyTitle: 'No hay reportes disponibles.', emptyDescription: 'Los reportes requieren fuentes de datos reales del backend.', icon: FileBarChart },
  usuarios: { title: 'Usuarios', description: 'Administra accesos, roles y permisos del equipo.', emptyTitle: 'No hay usuarios para mostrar.', emptyDescription: 'Los usuarios y permisos se cargarán desde el servicio de autenticación.', icon: ShieldCheck },
  configuracion: { title: 'Configuración', description: 'Define horarios, disponibilidad y parámetros de la clínica.', emptyTitle: 'Configuración no disponible.', emptyDescription: 'Los horarios y parámetros se habilitarán con su contrato de backend.', icon: Settings },
}

export function ModulePage({ module }: { module: ModuleKey }) {
  const current = modules[module]
  return <div><div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold tracking-tight text-ink-950">{current.title}</h1><p className="mt-2 text-slate-500">{current.description}</p></div>{module === 'pacientes' ? <button className="min-h-11 rounded-lg bg-clinic-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300" disabled title="Disponible al integrar el backend">Registrar paciente</button> : null}</div><div className="mt-6"><IntegrationPending compact/></div><section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white"><EmptyState description={current.emptyDescription} icon={current.icon} title={current.emptyTitle}/></section></div>
}
