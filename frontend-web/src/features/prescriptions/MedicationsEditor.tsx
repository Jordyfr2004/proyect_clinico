import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { emptyMedication } from './medications'
import type { Medication } from './prescriptionService'

const fields: [keyof Medication, string, boolean][] = [['nombre', 'Medicamento', true], ['dosis', 'Dosis', true], ['frecuencia', 'Frecuencia', true], ['duracion', 'Duración', false], ['indicaciones', 'Indicaciones', false]]
const inputClass = 'mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'

export function MedicationsEditor({ rows, onChange, disabled = false, idPrefix }: { rows: Medication[]; onChange: (rows: Medication[]) => void; disabled?: boolean; idPrefix: string }) {
  const update = (index: number, field: keyof Medication, value: string) => onChange(rows.map((row, current) => current === index ? { ...row, [field]: value } : row))
  return <fieldset className="grid gap-3"><legend className="text-sm font-semibold text-slate-700">Medicamentos</legend>
    {rows.map((row, index) => <div className="grid gap-2 rounded-xl border border-[#dbe6f2] p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]" data-testid="medication-row" key={index}>
      {fields.slice(0, 4).map(([field, label, required]) => <label className="block text-xs font-medium text-slate-600" htmlFor={`${idPrefix}-${index}-${field}`} key={field}>{label}{required ? ' *' : ''}<input className={inputClass} disabled={disabled} id={`${idPrefix}-${index}-${field}`} maxLength={field === 'nombre' ? 255 : 100} onChange={(event) => update(index, field, event.target.value)} value={row[field] ?? ''}/></label>)}
      <div className="flex items-end"><Button aria-label={`Quitar medicamento ${index + 1}`} disabled={disabled || rows.length === 1} onClick={() => onChange(rows.filter((_, current) => current !== index))} type="button" variant="ghost"><Trash2 aria-hidden="true" size={16}/></Button></div>
      <label className="block text-xs font-medium text-slate-600 sm:col-span-5" htmlFor={`${idPrefix}-${index}-indicaciones`}>Indicaciones del medicamento<input className={inputClass} disabled={disabled} id={`${idPrefix}-${index}-indicaciones`} maxLength={500} onChange={(event) => update(index, 'indicaciones', event.target.value)} value={row.indicaciones ?? ''}/></label>
    </div>)}
    <div><Button disabled={disabled || rows.length >= 20} onClick={() => onChange([...rows, emptyMedication()])} type="button" variant="secondary"><Plus aria-hidden="true" size={16}/>Agregar medicamento</Button></div>
  </fieldset>
}
