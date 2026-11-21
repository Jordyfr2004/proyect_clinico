import { Info, RotateCcw } from 'lucide-react'
import { useState } from 'react'

const upperRight = [18, 17, 16, 15, 14, 13, 12, 11]
const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28]
const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41]
const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38]
const conditions = [
  { id: 'sano', label: 'Sano', color: 'bg-slate-400', ring: 'border-slate-400 bg-slate-50' },
  { id: 'caries', label: 'Caries', color: 'bg-rose-500', ring: 'border-rose-400 bg-rose-50' },
  { id: 'restauracion', label: 'Restauración', color: 'bg-sky-500', ring: 'border-sky-400 bg-sky-50' },
  { id: 'ausente', label: 'Ausente', color: 'bg-amber-500', ring: 'border-amber-400 bg-amber-50' },
  { id: 'pendiente', label: 'Por evaluar', color: 'bg-violet-500', ring: 'border-violet-400 bg-violet-50' },
] as const
type Condition = typeof conditions[number]['id']
type ToothDraft = { condition: Condition; note: string }

function ToothSymbol() {
  return <svg aria-hidden="true" className="h-8 w-8" fill="none" viewBox="0 0 36 36">
    <path d="M9.4 5.6c-3.4 1-4.8 4.9-3.8 9.2l2.7 10.8c.5 2 1.2 4.7 3.4 4.7 2.3 0 2.1-4.6 4.1-7.2.6-.8 1.6-.8 2.2 0 2 2.6 1.8 7.2 4.1 7.2 2.2 0 2.9-2.7 3.4-4.7l2.7-10.8c1-4.3-.4-8.2-3.8-9.2-2.5-.8-4.3.6-6.4.6s-3.9-1.4-6.4-.6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/>
    <path d="M12 13.7c1.6 1.2 3.7 1.8 6 1.8s4.4-.6 6-1.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4"/>
  </svg>
}

function ToothRow({ right, left, selected, drafts, onSelect }: {
  right: number[]; left: number[]; selected: number; drafts: Record<number, ToothDraft>;
  onSelect: (tooth: number) => void
}) {
  const renderTooth = (number: number) => {
    const condition = conditions.find(({ id }) => id === drafts[number]?.condition)
    return <button aria-label={`Pieza ${number}`} aria-pressed={selected === number} className={`group flex w-11 shrink-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600 ${selected === number ? 'border-clinic-600 bg-clinic-50 text-clinic-700 shadow-sm' : condition ? `${condition.ring} text-ink-950` : 'border-[#dbe6f2] bg-white text-ink-950 hover:border-clinic-400 hover:bg-clinic-50'}`} key={number} onClick={() => onSelect(number)} type="button">
      <ToothSymbol/><span>{number}</span><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${condition?.color ?? 'bg-transparent'}`}/>
    </button>
  }
  return <div className="flex justify-center gap-3">
    <div className="flex gap-1.5">{right.map(renderTooth)}</div>
    <div className="flex gap-1.5">{left.map(renderTooth)}</div>
  </div>
}

export function OdontogramPreview() {
  const [selected, setSelected] = useState(11)
  const [drafts, setDrafts] = useState<Record<number, ToothDraft>>({})
  const selectedDraft = drafts[selected] ?? { condition: 'sano' as Condition, note: '' }
  const updateDraft = (change: Partial<ToothDraft>) => setDrafts((previous) => ({
    ...previous, [selected]: { ...previous[selected], condition: previous[selected]?.condition ?? 'sano', note: previous[selected]?.note ?? '', ...change },
  }))
  const marked = Object.keys(drafts).length

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-lg font-semibold text-ink-950">Odontograma</h3><p className="admin-muted mt-1 max-w-2xl text-sm">Explora las piezas dentales y prueba cómo se registrarían los hallazgos.</p></div><span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-clinic-700">Vista previa</span></div>
    <p className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-sm text-ink-950" role="status"><Info aria-hidden="true" className="mt-0.5 shrink-0 text-clinic-700" size={17}/>Los cambios de esta vista son temporales y no se guardan en el expediente.</p>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 rounded-2xl border border-[#e0e9f3] bg-[#fbfdff] p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold text-ink-950">Dentición permanente</p><p className="admin-muted mt-1 text-xs">Numeración de dos dígitos · 32 piezas</p></div><p className="admin-muted text-xs">{marked} {marked === 1 ? 'pieza marcada' : 'piezas marcadas'}</p></div>
        <div className="overflow-x-auto pb-2"><div className="mx-auto w-max space-y-6">
          <div><p className="admin-muted mb-2 text-center text-xs font-semibold uppercase tracking-wide">Arcada superior</p><ToothRow drafts={drafts} left={upperLeft} onSelect={setSelected} right={upperRight} selected={selected}/></div>
          <div className="border-t border-dashed border-[#cbd9e8] pt-6"><p className="admin-muted mb-2 text-center text-xs font-semibold uppercase tracking-wide">Arcada inferior</p><ToothRow drafts={drafts} left={lowerLeft} onSelect={setSelected} right={lowerRight} selected={selected}/></div>
        </div></div>
        <div className="mt-5 border-t border-[#e0e9f3] pt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-950">Leyenda de ejemplo</p><div className="flex flex-wrap gap-x-4 gap-y-2">{conditions.map(({ id, label, color }) => <span className="admin-muted inline-flex items-center gap-2 text-xs" key={id}><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${color}`}/>{label}</span>)}</div></div>
      </div>
      <aside aria-label={`Detalle de la pieza ${selected}`} className="rounded-2xl border border-[#e0e9f3] bg-white p-5"><p className="admin-kicker">Pieza seleccionada</p><h4 className="mt-1 text-2xl font-bold text-ink-950">{selected}</h4><p className="admin-muted mt-1 text-sm">Selecciona un estado para probar la vista.</p>
        <fieldset className="mt-5"><legend className="mb-2 text-sm font-semibold text-ink-950">Estado</legend><div className="grid gap-2">{conditions.map(({ id, label, color }) => <label className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${selectedDraft.condition === id ? 'border-clinic-500 bg-clinic-50 text-clinic-800' : 'border-[#e0e9f3] text-ink-950 hover:bg-slate-50'}`} key={id}><input checked={selectedDraft.condition === id} className="accent-blue-600" name={`condition-${selected}`} onChange={() => updateDraft({ condition: id })} type="radio"/><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${color}`}/>{label}</label>)}</div></fieldset>
        <label className="mt-5 block text-sm font-semibold text-ink-950">Observación<textarea className="admin-input mt-1 min-h-20 w-full resize-y text-sm" maxLength={250} onChange={(event) => updateDraft({ note: event.target.value })} placeholder="Anotación breve de esta pieza" rows={3} value={selectedDraft.note}/></label>
        <button className="admin-secondary mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold" onClick={() => setDrafts((previous) => { const next = { ...previous }; delete next[selected]; return next })} type="button"><RotateCcw aria-hidden="true" size={15}/>Limpiar pieza</button>
      </aside>
    </div>
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#e6edf6] pt-5"><p className="admin-muted text-sm">El guardado se habilitará cuando se defina el formato de datos con Laravel.</p><button className="admin-primary min-h-11 cursor-not-allowed rounded-lg px-5 text-sm font-semibold opacity-50" disabled type="button">Guardar odontograma</button></div>
  </div>
}
