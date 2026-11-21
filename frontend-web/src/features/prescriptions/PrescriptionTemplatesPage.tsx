import { ClipboardList, Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { Button } from '../../components/ui/Button'
import { requestError } from '../../utils/requestError'
import { cleanMedications, emptyMedication, medicationsError } from './medications'
import { MedicationsEditor } from './MedicationsEditor'
import { createPrescriptionTemplate, deletePrescriptionTemplate, getPrescriptionTemplates, updatePrescriptionTemplate, type Medication, type PrescriptionTemplate } from './prescriptionService'

type ListState = { kind: 'loading' } | { kind: 'ready'; records: PrescriptionTemplate[] } | { kind: 'error'; message: string }

function TemplateForm({ template, onSaved, onCancel, onBusyChange }: { template: PrescriptionTemplate | null; onSaved: (record: PrescriptionTemplate) => void; onCancel: () => void; onBusyChange: (busy: boolean) => void }) {
  const [nombre, setNombre] = useState(template?.nombre ?? '')
  const [indicaciones, setIndicaciones] = useState(template?.indicaciones ?? '')
  const [rows, setRows] = useState<Medication[]>(template ? template.medicamentos.map((item) => ({ ...emptyMedication(), ...item, duracion: item.duracion ?? '', indicaciones: item.indicaciones ?? '' })) : [emptyMedication()])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    const medicamentos = cleanMedications(rows)
    const invalid = !nombre.trim() ? 'Escribe un nombre para la plantilla.' : medicationsError(medicamentos)
    if (invalid) { setError(invalid); return }
    const values = { nombre: nombre.trim(), medicamentos, ...(indicaciones.trim() ? { indicaciones: indicaciones.trim() } : {}) }
    setBusy(true); onBusyChange(true); setError(null)
    try { onSaved(template ? await updatePrescriptionTemplate(template.id, values) : await createPrescriptionTemplate(values)) }
    catch (cause) { setError(requestError(cause, 'No fue posible guardar la plantilla.')) }
    finally { setBusy(false); onBusyChange(false) }
  }

  return <form aria-label={template ? 'Editar plantilla' : 'Nueva plantilla'} className="grid gap-4" onSubmit={(event) => { void submit(event) }}>
    <label className="block text-sm font-medium text-slate-700" htmlFor="template-name">Nombre<input className="mt-2 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px]" data-dialog-initial disabled={busy} id="template-name" maxLength={255} onChange={(event) => setNombre(event.target.value)} value={nombre}/></label>
    <MedicationsEditor disabled={busy} idPrefix="template-medication" onChange={setRows} rows={rows}/>
    <label className="block text-sm font-medium text-slate-700" htmlFor="template-instructions">Indicaciones generales<textarea className="admin-input mt-2 w-full" disabled={busy} id="template-instructions" maxLength={2000} onChange={(event) => setIndicaciones(event.target.value)} rows={3} value={indicaciones}/></label>
    {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
    <div className="flex flex-wrap justify-end gap-2"><Button disabled={busy} onClick={onCancel} type="button" variant="secondary">Cancelar</Button><Button disabled={busy} type="submit">{busy ? 'Guardando…' : 'Guardar plantilla'}</Button></div>
  </form>
}

export function PrescriptionTemplatesPage() {
  const [state, setState] = useState<ListState>({ kind: 'loading' })
  const [reload, setReload] = useState(0)
  const [editing, setEditing] = useState<PrescriptionTemplate | 'new' | null>(null)
  const [formBusy, setFormBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<PrescriptionTemplate | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void getPrescriptionTemplates(false, controller.signal).then(
      (records) => setState({ kind: 'ready', records }),
      (error: unknown) => { if (!controller.signal.aborted) setState({ kind: 'error', message: requestError(error, 'No fue posible cargar las plantillas.') }) },
    )
    return () => controller.abort()
  }, [reload])

  const replace = (record: PrescriptionTemplate) => setState((current) => current.kind !== 'ready' ? current : { kind: 'ready', records: [...current.records.filter((item) => item.id !== record.id), record].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) })

  const toggle = async (record: PrescriptionTemplate) => {
    if (busyId) return
    setBusyId(record.id); setNotice(null)
    try { replace(await updatePrescriptionTemplate(record.id, { activo: !record.activo })) }
    catch (cause) { setNotice({ kind: 'error', text: requestError(cause, 'No fue posible actualizar la plantilla.') }) }
    finally { setBusyId(null) }
  }

  const remove = async () => {
    if (!confirmDelete || busyId) return
    setBusyId(confirmDelete.id)
    try {
      await deletePrescriptionTemplate(confirmDelete.id)
      setState((current) => current.kind === 'ready' ? { kind: 'ready', records: current.records.filter((item) => item.id !== confirmDelete.id) } : current)
      setNotice({ kind: 'success', text: 'Plantilla eliminada.' })
    } catch (cause) { setNotice({ kind: 'error', text: requestError(cause, 'No fue posible eliminar la plantilla.') }) }
    finally { setBusyId(null); setConfirmDelete(null) }
  }

  return <section aria-labelledby="templates-title" className="admin-reveal admin-surface max-w-[1100px] rounded-[20px] p-6 sm:p-8">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="admin-kicker">Recetas</p><h1 className="mt-2 text-2xl font-semibold text-ink-950" id="templates-title">Plantillas de recetas</h1><p className="admin-muted mt-1 text-sm">Medicamentos e indicaciones que se aplican con un clic al emitir una receta.</p></div>{state.kind === 'ready' ? <Button onClick={() => { setNotice(null); setEditing('new') }} type="button"><Plus aria-hidden="true" size={16}/>Nueva plantilla</Button> : null}</div>
    {notice ? <p className={`mt-4 rounded-xl p-3 text-sm ${notice.kind === 'success' ? 'admin-success' : 'bg-red-50 text-red-700'}`} role={notice.kind === 'success' ? 'status' : 'alert'}>{notice.text}</p> : null}
    {editing ? <AccessibleDialog busy={formBusy} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nueva plantilla' : 'Editar plantilla'} titleId="template-dialog-title"><TemplateForm onBusyChange={setFormBusy} onCancel={() => setEditing(null)} onSaved={(record) => { replace(record); setEditing(null); setNotice({ kind: 'success', text: 'Plantilla guardada.' }) }} template={editing === 'new' ? null : editing}/></AccessibleDialog> : null}
    {confirmDelete ? <AccessibleDialog busy={busyId !== null} compact onClose={() => setConfirmDelete(null)} title="Eliminar plantilla" titleId="delete-template-title"><p className="text-sm text-slate-700">Se eliminará la plantilla <strong>{confirmDelete.nombre}</strong>. Las recetas ya emitidas no cambian.</p><div className="mt-5 flex flex-wrap justify-end gap-2"><Button disabled={busyId !== null} onClick={() => setConfirmDelete(null)} type="button" variant="secondary">Cancelar</Button><Button className="bg-red-600 hover:bg-red-700" disabled={busyId !== null} onClick={() => { void remove() }} type="button">Eliminar</Button></div></AccessibleDialog> : null}
    {state.kind === 'loading' ? <LoadingState/> : state.kind === 'error' ? <ErrorState description={state.message} onRetry={() => { setState({ kind: 'loading' }); setReload((value) => value + 1) }}/> : state.records.length === 0 ? <div className="mt-5"><EmptyState description="Crea una plantilla para las recetas que emites con frecuencia." icon={ClipboardList} title="Sin plantillas"/></div> : <ul className="mt-5 grid gap-3">{state.records.map((record) => <li className="rounded-xl border border-[#dbe6f2] p-4" key={record.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-ink-950">{record.nombre}{record.activo ? null : <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Inactiva</span>}</p><p className="admin-muted text-sm">{record.medicamentos.map((item) => item.nombre).join(', ')}</p></div><div className="flex flex-wrap gap-2"><Button aria-label={`Editar ${record.nombre}`} onClick={() => { setNotice(null); setEditing(record) }} type="button" variant="secondary">Editar</Button><Button aria-label={`${record.activo ? 'Desactivar' : 'Activar'} ${record.nombre}`} disabled={busyId === record.id} onClick={() => { void toggle(record) }} type="button" variant="ghost">{record.activo ? 'Desactivar' : 'Activar'}</Button><Button aria-label={`Eliminar ${record.nombre}`} onClick={() => setConfirmDelete(record)} type="button" variant="ghost">Eliminar</Button></div></div></li>)}</ul>}
  </section>
}
