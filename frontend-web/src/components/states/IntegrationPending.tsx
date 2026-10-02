import { Cable, Info } from 'lucide-react'

export function IntegrationPending({ compact = false, detail }: { compact?: boolean; detail?: string }) {
  return (
    <div className={`admin-state w-full border-t border-[#dce9f7] bg-[#f2f8ff] text-[#526a87] ${compact ? 'rounded-[10px] px-4 py-3' : 'rounded-[14px] p-5 sm:p-6'}`} role="status">
      <div className="flex gap-3.5">
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e0f1ff] text-[#1269dd]">{compact ? <Cable size={17}/> : <Info size={19}/>}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-[#124a91]">Integración pendiente</p>
          <p className="mt-1 text-sm leading-6">{detail ?? 'Los datos se mostrarán cuando el backend esté disponible y exista un contrato de API confirmado.'}</p>
        </div>
      </div>
    </div>
  )
}
