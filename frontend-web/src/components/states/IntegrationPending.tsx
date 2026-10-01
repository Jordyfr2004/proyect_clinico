import { Cable, Info } from 'lucide-react'

export function IntegrationPending({ compact = false, detail }: { compact?: boolean; detail?: string }) {
  return (
    <div className={`border border-slate-200 border-l-[3px] border-l-clinic-400 bg-white text-slate-600 ${compact ? 'rounded-lg px-4 py-3' : 'rounded-xl p-5'}`} role="status">
      <div className="flex gap-3">
        {compact ? <Cable aria-hidden="true" className="mt-0.5 shrink-0 text-clinic-600" size={18}/> : <Info aria-hidden="true" className="mt-0.5 shrink-0 text-clinic-600" size={22}/>}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-clinic-700">Integración pendiente</p>
          <p className="mt-1 text-sm leading-6">{detail ?? 'Los datos se mostrarán cuando el backend esté disponible y exista un contrato de API confirmado.'}</p>
        </div>
      </div>
    </div>
  )
}
