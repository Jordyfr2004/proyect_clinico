import { isAxiosError } from 'axios'
import { FileText, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { markClinicalQueriesStale, useClinicalQuery } from '../../services/clinicalQuery'
import { formatDate, formatFileSize } from '../../utils/displayFormat'
import { useAuth } from '../auth/authContext'
import { useClinicalUnsavedChanges } from '../patients/odontogramUnsavedChanges'
import type { Patient } from '../patients/patientService'
import { getEvidenceFile, createPatientEvidence, deletePatientEvidence, getPatientEvidence, updatePatientEvidence, type Evidence, type EvidenceType } from './evidenceService'

type Dialog = { kind: 'create' } | { kind: 'edit' | 'delete'; record: Evidence }
type FormValues = { tipo: EvidenceType; descripcion: string | null; fecha: string; archivo: File | null }
const evidenceTypes: Record<EvidenceType, string> = { rx: 'Radiografía', caso_clinico: 'Caso clínico', documento: 'Documento' }
const acceptedFiles = '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf'
const maxFileSize = 20 * 1024 * 1024
const generatedFileName = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i

function evidenceTitle(record: Evidence): string {
  if (!generatedFileName.test(record.nombre_archivo)) return record.nombre_archivo
  return record.descripcion?.trim() || `${evidenceTypes[record.tipo]} · ${formatDate(record.fecha)}`
}

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible confirmar el cambio. Consulta las evidencias antes de intentarlo de nuevo.'
    if ([403, 404, 409, 422].includes(error.response.status)) {
      const message = (error.response.data as { message?: unknown } | undefined)?.message
      if (typeof message === 'string' && message.trim() && message.length <= 300 && !/exception|stack|token|password|sqlstate/i.test(message)) return message
    }
  }
  return 'No fue posible completar la operación. Inténtalo de nuevo.'
}

function loadErrorMessage(error: unknown): string {
  return isAxiosError(error) && !error.response ? 'No fue posible comunicarse con el servidor.' : 'No fue posible cargar las evidencias clínicas.'
}

function EvidenceForm({ record, busy, error, onSave, onCancel, onDirtyChange }: { record?: Evidence; busy: boolean; error: string | null; onSave: (values: FormValues) => void; onCancel: () => void; onDirtyChange: (dirty: boolean) => void }) {
  const [tipo, setTipo] = useState<EvidenceType>(record?.tipo ?? 'rx')
  const [fecha, setFecha] = useState(record?.fecha.slice(0, 10) ?? '')
  const [descripcion, setDescripcion] = useState(record?.descripcion ?? '')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [validation, setValidation] = useState<string | null>(null)
  const dirty = tipo !== (record?.tipo ?? 'rx') || fecha !== (record?.fecha.slice(0, 10) ?? '') || descripcion !== (record?.descripcion ?? '') || archivo !== null
  useClinicalUnsavedChanges(dirty || busy)
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false) }, [dirty, onDirtyChange])
  const cancel = onCancel
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (record && !fecha) { setValidation('Selecciona la fecha de la evidencia.'); return }
    if (!record && !archivo) { setValidation('Selecciona un archivo.'); return }
    if (archivo && !/\.(jpe?g|png|webp|pdf)$/i.test(archivo.name)) { setValidation('Selecciona un archivo JPG, PNG, WebP o PDF.'); return }
    if (archivo && archivo.size > maxFileSize) { setValidation('El archivo no puede superar 20 MB.'); return }
    if (!record && descripcion.length > 1000) { setValidation('La descripción no puede superar 1000 caracteres.'); return }
    setValidation(null)
    onSave({ tipo, fecha, descripcion: descripcion.trim() || null, archivo })
  }
  return <form aria-label={record ? 'Editar evidencia clínica' : 'Registrar evidencia clínica'} noValidate onSubmit={submit}>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-ink-950">Tipo<select className="admin-input mt-1 w-full text-sm" data-dialog-initial disabled={busy} onChange={(event) => setTipo(event.target.value as EvidenceType)} value={tipo}><option value="rx">Radiografía</option><option value="caso_clinico">Caso clínico</option><option value="documento">Documento</option></select></label>
      <label className="text-sm font-medium text-ink-950">{record ? 'Fecha' : 'Fecha (opcional)'}<input className="admin-input mt-1 w-full text-sm" disabled={busy} onChange={(event) => setFecha(event.target.value)} required={Boolean(record)} type="date" value={fecha}/></label>
      {!record ? <label className="text-sm font-medium text-ink-950 sm:col-span-2">Archivo<input accept={acceptedFiles} aria-label="Archivo" className="admin-input mt-1 w-full py-2 text-sm" disabled={busy} onChange={(event) => { setArchivo(event.target.files?.[0] ?? null); setValidation(null) }} required type="file"/><span className="admin-muted mt-1 block text-xs">JPG, PNG, WebP o PDF · máximo 20 MB.</span></label> : null}
      <label className="text-sm font-medium text-ink-950 sm:col-span-2">Descripción (opcional)<textarea aria-label="Descripción" className="admin-input mt-1 w-full py-3 text-sm" disabled={busy} onChange={(event) => setDescripcion(event.target.value)} maxLength={record ? undefined : 1000} rows={3} value={descripcion}/></label>
    </div>
    {validation || error ? <p className="mt-4 text-sm text-red-700" role="alert">{validation ?? error}</p> : null}
    <div className="mt-6 flex flex-wrap gap-3"><button className="admin-primary min-h-11 rounded-lg px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Guardando…' : record ? 'Guardar cambios' : 'Guardar evidencia'}</button><button className="admin-secondary min-h-11 rounded-lg px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={cancel} type="button">Volver</button></div>
  </form>
}

function EvidenceFile({ record }: { record: Evidence }) {
  const [state, setState] = useState<{ url?: string; error?: string; loading?: boolean }>({})
  const controller = useRef<AbortController | null>(null)
  const objectUrl = useRef<string | null>(null)
  useEffect(() => () => { controller.current?.abort(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current) }, [record.id])
  const load = async () => {
    if (state.loading) return
    controller.current?.abort()
    const request = new AbortController(); controller.current = request
    setState({ loading: true })
    try {
      const blob = await getEvidenceFile(record.id, request.signal)
      if (request.signal.aborted) return
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
      const url = URL.createObjectURL(blob); objectUrl.current = url; setState({ url })
    } catch { if (!request.signal.aborted) setState({ error: 'No fue posible abrir el archivo. Inténtalo de nuevo.' }) }
  }
  return <div className="mt-4 flex flex-wrap items-center gap-3">{state.url ? <><a className="admin-secondary inline-flex min-h-10 items-center rounded-lg px-3 text-sm" href={state.url} rel="noopener noreferrer" target="_blank">Ver archivo</a><a className="text-sm text-clinic-700 underline" download={record.nombre_archivo} href={state.url}>Descargar archivo</a></> : <button className="admin-secondary min-h-10 rounded-lg px-3 text-sm" disabled={state.loading} onClick={() => { void load() }} type="button">{state.loading ? 'Cargando archivo…' : 'Abrir archivo'}</button>}{state.error ? <p className="text-sm text-red-700" role="alert">{state.error}</p> : null}</div>
}

export function PatientEvidenceSection() {
  const patient = useOutletContext<Patient>()
  const { user } = useAuth()
  const doctor = user?.role === 'doctora'
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const pendingMutation = useRef(false)
  const formDirty = useRef(false)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const query = useClinicalQuery(['evidence', patient.id], (signal) => getPatientEvidence(patient.id, signal))
  const missing = isAxiosError(query.error) && query.error.response?.status === 404

  const openDialog = (next: Dialog, button: HTMLButtonElement) => { trigger.current = button; setActionError(null); setSuccess(null); setDialog(next) }
  const closeDialog = () => { if (pendingMutation.current) return; if (formDirty.current && !window.confirm('¿Descartar los cambios de la evidencia?')) return; setDialog(null); setActionError(null); trigger.current?.focus() }
  const mutate = async (values?: FormValues) => {
    if (!doctor || !dialog || pendingMutation.current) return
    pendingMutation.current = true; setBusy(true); setActionError(null)
    try {
      let message: string
      if (dialog.kind === 'create' && values?.archivo) message = await createPatientEvidence({ paciente_id: patient.id, tipo: values.tipo, archivo: values.archivo, descripcion: values.descripcion, fecha: values.fecha })
      else if (dialog.kind === 'edit' && values) message = await updatePatientEvidence(dialog.record.id, { tipo: values.tipo, descripcion: values.descripcion, fecha: values.fecha })
      else if (dialog.kind === 'delete') message = await deletePatientEvidence(dialog.record.id)
      else return
      await markClinicalQueriesStale(['evidence', patient.id])
      const refreshed = await query.refetch()
      setSuccess(refreshed.isSuccess ? message : `${message} No fue posible actualizar el listado; vuelve a consultarlo.`)
      setDialog(null)
      if (trigger.current && document.contains(trigger.current)) trigger.current.focus()
      else heading.current?.focus()
    } catch (cause) { setActionError(errorMessage(cause)) }
    finally { pendingMutation.current = false; setBusy(false) }
  }

  return <section aria-labelledby="evidence-title" className="admin-surface rounded-[20px] p-6 sm:p-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="admin-kicker">Expediente clínico</p><h2 className="mt-2 text-xl font-semibold text-ink-950" id="evidence-title" ref={heading} tabIndex={-1}>Evidencias clínicas</h2></div>{doctor ? <button className="admin-primary inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold" onClick={(event) => openDialog({ kind: 'create' }, event.currentTarget)} type="button"><Plus aria-hidden="true" size={18}/>Registrar evidencia</button> : null}</div>
    {success ? <p className="admin-success mt-5 rounded-xl p-4 text-sm" role="status">{success}</p> : null}
    {query.isFetching && query.data && !query.isError ? <p className="admin-muted mt-4 text-sm" role="status">Actualizando evidencias…</p> : null}
    {query.isError ? missing ? <p className="admin-muted mt-5 text-sm" role="alert">Paciente no encontrado.</p> : <div className="mt-5"><ErrorState description={loadErrorMessage(query.error)} onRetry={() => { void query.refetch() }}/></div> : !query.data ? <LoadingState/> : query.data.length === 0 ? <div className="mt-5"><EmptyState description="No hay evidencias registradas para este paciente." icon={FileText} title="Sin evidencias clínicas"/></div> : <ul className="mt-5 grid gap-3">{query.data.map((record) => <li className="rounded-xl border border-[#dbe6f2] p-4" key={record.id}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold text-ink-950">{evidenceTitle(record)}</p>{generatedFileName.test(record.nombre_archivo) ? <p className="admin-muted mt-1 break-all text-xs">Archivo: <span>{record.nombre_archivo}</span></p> : null}<span className="admin-pill admin-pill-ready mt-2">{evidenceTypes[record.tipo]}</span></div>{doctor ? <div className="flex flex-wrap gap-2"><button className="admin-secondary min-h-10 rounded-lg px-3 text-xs font-semibold" onClick={(event) => openDialog({ kind: 'edit', record }, event.currentTarget)} type="button">Editar evidencia</button><button className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700" onClick={(event) => openDialog({ kind: 'delete', record }, event.currentTarget)} type="button">Eliminar evidencia</button></div> : null}</div><dl className="admin-muted mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="font-medium">Fecha</dt><dd>{formatDate(record.fecha)}</dd></div><div><dt className="font-medium">Formato</dt><dd>{record.mime_type}</dd></div><div><dt className="font-medium">Tamaño</dt><dd>{formatFileSize(record.tamano)}</dd></div>{record.descripcion ? <div className="sm:col-span-2"><dt className="font-medium">Descripción</dt><dd className="break-words">{record.descripcion}</dd></div> : null}</dl><EvidenceFile record={record}/></li>)}</ul>}
    {dialog ? <AccessibleDialog busy={busy} onClose={closeDialog} title={dialog.kind === 'create' ? 'Registrar evidencia clínica' : dialog.kind === 'edit' ? 'Editar evidencia clínica' : 'Eliminar evidencia clínica'} titleId="evidence-dialog-title">{dialog.kind === 'delete' ? <div><p className="admin-body text-sm">¿Eliminar la evidencia {dialog.record.nombre_archivo}? Esta acción no se puede deshacer.</p>{actionError ? <p className="mt-4 text-sm text-red-700" role="alert">{actionError}</p> : null}<div className="mt-6 flex flex-wrap gap-3"><button className="min-h-11 rounded-lg bg-red-700 px-5 text-sm font-semibold text-white disabled:opacity-60" data-dialog-initial disabled={busy} onClick={() => { void mutate() }} type="button">{busy ? 'Eliminando…' : 'Confirmar eliminación'}</button><button className="admin-secondary min-h-11 rounded-lg px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={closeDialog} type="button">Volver</button></div></div> : <EvidenceForm onDirtyChange={(dirty) => { formDirty.current = dirty }} busy={busy} error={actionError} key={dialog.kind === 'edit' ? dialog.record.id : 'new'} onCancel={closeDialog} onSave={(values) => { void mutate(values) }} record={dialog.kind === 'edit' ? dialog.record : undefined}/>}</AccessibleDialog> : null}
  </section>
}
