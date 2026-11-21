import { Pill, Plus, Printer } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { Button } from '../../components/ui/Button'
import { requestError } from '../../utils/requestError'
import { formatDate } from '../../utils/displayFormat'
import { useAuth } from '../auth/authContext'
import type { Patient } from '../patients/patientService'
import { cleanMedications, emptyMedication, medicationsError } from './medications'
import { MedicationsEditor } from './MedicationsEditor'
import { createPrescription, deletePrescription, getPatientPrescriptions, getPrescriptionTemplates, type Medication, type Prescription, type PrescriptionTemplate } from './prescriptionService'
import { printPrescription } from './printPrescription'

type ListState = { kind: 'loading' } | { kind: 'ready'; records: Prescription[] } | { kind: 'error'; message: string }

function PrescriptionForm({ patientId, onCreated, onCancel, onBusyChange }: { patientId: string; onCreated: (record: Prescription) => void; onCancel: () => void; onBusyChange: (busy: boolean) => void }) {
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([])
  const [diagnostico, setDiagnostico] = useState('')
  const [indicaciones, setIndicaciones] = useState('')
  const [rows, setRows] = useState<Medication[]>([emptyMedication()])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    // Las plantillas son una ayuda: si no cargan, la receta se escribe a mano.
    void getPrescriptionTemplates(true, controller.signal).then(setTemplates, () => setTemplates([]))
    return () => controller.abort()
  }, [])

  const applyTemplate = (id: string) => {
    const template = templates.find((item) => item.id === id)
    if (!template) return
    setRows(template.medicamentos.map((item) => ({ ...emptyMedication(), ...item, duracion: item.duracion ?? '', indicaciones: item.indicaciones ?? '' })))
    setIndicaciones(template.indicaciones ?? '')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    const medicamentos = cleanMedications(rows)
    const invalid = medicationsError(medicamentos)
    if (invalid) { setError(invalid); return }
    setBusy(true); onBusyChange(true); setError(null)
    try {
      onCreated(await createPrescription({ paciente_id: patientId, medicamentos, ...(diagnostico.trim() ? { diagnostico: diagnostico.trim() } : {}), ...(indicaciones.trim() ? { indicaciones: indicaciones.trim() } : {}) }))
    } catch (cause) { setError(requestError(cause, 'No fue posible emitir la receta.')) }
    finally { setBusy(false); onBusyChange(false) }
  }

  return <form aria-label="Nueva receta" className="grid gap-4" onSubmit={(event) => { void submit(event) }}>
    {templates.length > 0 ? <label className="block text-sm font-medium text-slate-700" htmlFor="prescription-template">Usar plantilla<select className="mt-2 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px]" data-dialog-initial disabled={busy} defaultValue="" id="prescription-template" onChange={(event) => applyTemplate(event.target.value)}><option value="">Sin plantilla</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.nombre}</option>)}</select></label> : null}
    <label className="block text-sm font-medium text-slate-700" htmlFor="prescription-diagnosis">Diagnóstico<input className="mt-2 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px]" disabled={busy} id="prescription-diagnosis" maxLength={2000} onChange={(event) => setDiagnostico(event.target.value)} value={diagnostico}/></label>
    <MedicationsEditor disabled={busy} idPrefix="prescription-medication" onChange={setRows} rows={rows}/>
    <label className="block text-sm font-medium text-slate-700" htmlFor="prescription-instructions">Indicaciones generales<textarea className="admin-input mt-2 w-full" disabled={busy} id="prescription-instructions" maxLength={2000} onChange={(event) => setIndicaciones(event.target.value)} rows={3} value={indicaciones}/></label>
    {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
    <div className="flex flex-wrap justify-end gap-2"><Button disabled={busy} onClick={onCancel} type="button" variant="secondary">Cancelar</Button><Button disabled={busy} type="submit">{busy ? 'Emitiendo…' : 'Emitir receta'}</Button></div>
  </form>
}

export function PatientPrescriptionsSection() {
  const patient = useOutletContext<Patient>()
  const { user } = useAuth()
  const canWrite = user?.role === 'doctora'
  const [state, setState] = useState<ListState>({ kind: 'loading' })
  const [reload, setReload] = useState(0)
  const [creating, setCreating] = useState(false)
  const [formBusy, setFormBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Prescription | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void getPatientPrescriptions(patient.id, controller.signal).then(
      (records) => setState({ kind: 'ready', records }),
      (error: unknown) => { if (!controller.signal.aborted) setState({ kind: 'error', message: requestError(error, 'No fue posible cargar las recetas.') }) },
    )
    return () => controller.abort()
  }, [patient.id, reload])

  const remove = async () => {
    if (!confirmDelete || deleting) return
    setDeleting(true)
    try {
      await deletePrescription(confirmDelete.id)
      setState((current) => current.kind === 'ready' ? { kind: 'ready', records: current.records.filter((record) => record.id !== confirmDelete.id) } : current)
      setNotice({ kind: 'success', text: 'Receta eliminada.' })
    } catch (cause) { setNotice({ kind: 'error', text: requestError(cause, 'No fue posible eliminar la receta.') }) }
    finally { setDeleting(false); setConfirmDelete(null) }
  }

  return <section aria-labelledby="prescriptions-title" className="admin-surface rounded-[20px] p-6 sm:p-8">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="admin-kicker">Expediente clínico</p><h2 className="mt-2 text-xl font-semibold text-ink-950" id="prescriptions-title">Recetas</h2></div>{canWrite && state.kind === 'ready' ? <Button onClick={() => { setNotice(null); setCreating(true) }} type="button"><Plus aria-hidden="true" size={16}/>Nueva receta</Button> : null}</div>
    {notice ? <p className={`mt-4 rounded-xl p-3 text-sm ${notice.kind === 'success' ? 'admin-success' : 'bg-red-50 text-red-700'}`} role={notice.kind === 'success' ? 'status' : 'alert'}>{notice.text}</p> : null}
    {creating ? <AccessibleDialog busy={formBusy} onClose={() => setCreating(false)} title="Nueva receta" titleId="new-prescription-title"><PrescriptionForm onBusyChange={setFormBusy} onCancel={() => setCreating(false)} onCreated={(record) => { setState((current) => current.kind === 'ready' ? { kind: 'ready', records: [record, ...current.records] } : current); setCreating(false); setNotice({ kind: 'success', text: 'Receta emitida. El paciente puede verla en la app móvil.' }) }} patientId={patient.id}/></AccessibleDialog> : null}
    {confirmDelete ? <AccessibleDialog busy={deleting} compact onClose={() => setConfirmDelete(null)} title="Eliminar receta" titleId="delete-prescription-title"><p className="text-sm text-slate-700">Se eliminará la receta del {formatDate(confirmDelete.fecha)} y el paciente dejará de verla en la app móvil.</p><div className="mt-5 flex flex-wrap justify-end gap-2"><Button disabled={deleting} onClick={() => setConfirmDelete(null)} type="button" variant="secondary">Cancelar</Button><Button className="bg-red-600 hover:bg-red-700" disabled={deleting} onClick={() => { void remove() }} type="button">{deleting ? 'Eliminando…' : 'Eliminar'}</Button></div></AccessibleDialog> : null}
    {state.kind === 'loading' ? <LoadingState/> : state.kind === 'error' ? <ErrorState description={state.message} onRetry={() => { setState({ kind: 'loading' }); setReload((value) => value + 1) }}/> : state.records.length === 0 ? <div className="mt-5"><EmptyState description="Todavía no se han emitido recetas para este paciente." icon={Pill} title="Sin recetas"/></div> : <ul className="mt-5 grid gap-3">{state.records.map((record) => <li className="rounded-xl border border-[#dbe6f2] p-4" key={record.id}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-ink-950">Receta del {formatDate(record.fecha)}</p>{record.diagnostico ? <p className="admin-muted text-sm">{record.diagnostico}</p> : null}</div><div className="flex flex-wrap gap-2"><Button aria-label={`Imprimir receta del ${formatDate(record.fecha)}`} onClick={() => { if (!printPrescription(record, patient.nombres)) setNotice({ kind: 'error', text: 'Permite las ventanas emergentes para imprimir la receta.' }) }} type="button" variant="secondary"><Printer aria-hidden="true" size={16}/>Imprimir</Button>{canWrite ? <Button aria-label={`Eliminar receta del ${formatDate(record.fecha)}`} onClick={() => setConfirmDelete(record)} type="button" variant="ghost">Eliminar</Button> : null}</div></div>
      <table className="mt-3 w-full text-left text-sm"><thead className="admin-muted"><tr><th className="py-1 pr-3 font-medium">Medicamento</th><th className="py-1 pr-3 font-medium">Dosis</th><th className="py-1 pr-3 font-medium">Frecuencia</th><th className="py-1 font-medium">Duración</th></tr></thead><tbody>{record.medicamentos.map((item, index) => <tr className="border-t border-[#eef3f8]" key={index}><td className="py-1.5 pr-3">{item.nombre}{item.indicaciones ? <span className="admin-muted block text-xs">{item.indicaciones}</span> : null}</td><td className="py-1.5 pr-3">{item.dosis}</td><td className="py-1.5 pr-3">{item.frecuencia}</td><td className="py-1.5">{item.duracion || '—'}</td></tr>)}</tbody></table>
      {record.indicaciones ? <p className="admin-muted mt-3 text-sm"><span className="font-medium">Indicaciones:</span> {record.indicaciones}</p> : null}
      {record.emitida_por ? <p className="admin-muted mt-2 text-xs">Emitida por {record.emitida_por.name}</p> : null}
    </li>)}</ul>}
  </section>
}
