import { Cable, Info } from 'lucide-react'

export function IntegrationPending({ compact = false, detail }: { compact?: boolean; detail?: string }) {
  return <div className={`border border-clinic-200 bg-clinic-50 text-slate-700 ${compact ? 'rounded-lg p-3' : 'rounded-xl p-5'}`} role="status"><div className="flex gap-3">{compact ? <Cable className="mt-0.5 shrink-0 text-clinic-600" size={18}/> : <Info className="mt-0.5 shrink-0 text-clinic-600" size={22}/>}<div><p className="font-semibold text-clinic-700">Integración pendiente</p><p className="mt-1 text-sm leading-6">{detail ?? 'Los datos se mostrarán cuando el backend esté disponible y exista un contrato de API confirmado.'}</p></div></div></div>
}
