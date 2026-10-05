import { ChartNoAxesCombined } from 'lucide-react'

type ModuleKey = 'reportes'

const modules = {
  reportes: { title: 'Reportes', description: 'Información clínica, operativa y financiera.', icon: ChartNoAxesCombined, capabilities: ['Estadísticas', 'Reportes clínicos', 'Reportes administrativos'] },
} as const

export function ModulePage({ module }: { module: ModuleKey }) {
  const current = modules[module]
  const Icon = current.icon

  return (
    <div className="admin-reveal max-w-5xl">
      <div className="mb-8"><p className="admin-kicker">Módulo clínico</p><h1 className="admin-page-title mt-2">{current.title}</h1><p className="admin-body mt-3 max-w-2xl">{current.description}</p></div>
      <section aria-labelledby="module-status-title" className="admin-surface-raised overflow-hidden rounded-[22px]">
        <div className="grid md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="admin-pending-hero px-6 py-9 sm:px-10 sm:py-12">
            <span aria-hidden="true" className="mb-7 grid size-14 place-items-center rounded-[16px] border border-sky-200/30 bg-sky-100/10 text-sky-100"><Icon size={26} strokeWidth={1.6}/></span>
            <span className="inline-flex rounded-full border border-cyan-200/30 bg-cyan-100/10 px-3 py-1.5 text-xs font-bold text-cyan-100">En preparación</span>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-white" id="module-status-title">Módulo en preparación</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-sky-100/85">La integración de {current.title.toLowerCase()} está pendiente de un contrato de backend confirmado. Sus datos aparecerán aquí cuando el servicio real esté disponible.</p>
          </div>
          <div className="border-t border-[#dbe6f2] bg-[#f1f7fd] px-6 py-8 sm:px-8 md:border-l md:border-t-0">
            <p className="admin-kicker">Alcance previsto</p>
            <ul className="mt-5 space-y-3">{current.capabilities.map((capability) => <li className="flex items-center gap-3 text-sm text-[#355878]" key={capability}><span aria-hidden="true" className="size-1.5 rounded-full bg-[#1685e6]"/>{capability}</li>)}</ul>
          </div>
        </div>
      </section>
    </div>
  )
}
