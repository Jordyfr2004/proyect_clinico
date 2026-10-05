import { isAxiosError } from 'axios'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { formatDate } from '../../utils/displayFormat'
import { CalendarDays } from 'lucide-react'
import { cancelAppointment, completeAppointment, deleteAgendaEntry, getAgendaMonth, getPendingRequests, programRequest, registerClinicalData, updateAgendaEntry, type AgendaEntry, type AgendaSlot, type ClinicalDataPayload } from '../agenda/agendaService'

type PageState = { kind: 'loading' } | { kind: 'ready'; entries: AgendaEntry[]; pending: AgendaEntry[] } | { kind: 'error'; message: string }
type DialogKind = 'program' | 'edit' | 'clinical' | 'cancel' | 'complete' | 'delete'
type DialogState = { kind: DialogKind; entry: AgendaEntry }
type StatusFilter = 'todos' | NonNullable<AgendaEntry['estado']>
type AppointmentValues = AgendaSlot & { descripcion?: string | null }
const inputClass = 'admin-input mt-1 w-full text-sm'
const statusLabels: Record<NonNullable<AgendaEntry['estado']>, string> = {
  pendiente: 'Pendiente', programada: 'Programada', cancelada: 'Cancelada', completada: 'Completada',
}
const dialogTitles: Record<DialogKind, string> = {
  program: 'Programar solicitud', edit: 'Editar registro', clinical: 'Datos clínicos',
  cancel: 'Cancelar cita médica', complete: 'Completar cita médica', delete: 'Eliminar registro',
}
const clinicalActionLabel = (entry: AgendaEntry) => entry.diagnostico || entry.tratamiento || entry.observacion ? 'Editar datos clínicos' : 'Registrar datos clínicos'

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible comunicarse con el servidor.'
    if ([403, 404, 409, 422].includes(error.response.status)) {
      const message = (error.response.data as { message?: unknown } | undefined)?.message
      if (typeof message === 'string' && message.trim()) return message
    }
  }
  return 'No fue posible completar la operación. Inténtalo de nuevo.'
}

function AppointmentDialogForm({ dialog, busy, error, onSave, onCancel }: {
  dialog: DialogState; busy: boolean; error: string | null;
  onSave: (values?: AppointmentValues) => Promise<void>; onCancel: () => void
}) {
  const [fecha, setFecha] = useState(dialog.kind === 'edit' ? dialog.entry.fecha?.slice(0, 10) ?? '' : '')
  const [inicio, setInicio] = useState(dialog.entry.hora_inicio?.slice(0, 5) ?? '')
  const [fin, setFin] = useState(dialog.entry.hora_fin?.slice(0, 5) ?? '')
  const [descripcion, setDescripcion] = useState(dialog.entry.descripcion ?? '')
  const [validation, setValidation] = useState<string | null>(null)
  const confirmation = ['cancel', 'complete', 'delete'].includes(dialog.kind)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (confirmation) { void onSave(); return }
    if (!fecha || !inicio || !fin || fin <= inicio) {
      setValidation('Revisa la fecha y el horario. La hora final debe ser posterior a la inicial.')
      return
    }
    setValidation(null)
    void onSave({ fecha, hora_inicio: inicio, hora_fin: fin, ...(dialog.kind === 'edit' ? { descripcion: descripcion.trim() || null } : {}) })
  }
  return <form aria-label={dialog.kind === 'program' ? 'Programar solicitud' : 'Datos de agenda'} noValidate onSubmit={submit}>
    {confirmation ? <p className="admin-body text-sm">{dialog.kind === 'delete' ? '¿Eliminar este registro de agenda?' : dialog.kind === 'cancel' ? '¿Cancelar esta cita médica?' : '¿Completar esta cita médica? El backend requiere diagnóstico y tratamiento registrados previamente.'}</p> : <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-ink-950">Fecha<input className={inputClass} data-dialog-initial onChange={(event) => setFecha(event.target.value)} required type="date" value={fecha}/></label>
      <label className="text-sm font-medium text-ink-950">Hora de inicio<input className={inputClass} onChange={(event) => setInicio(event.target.value)} required type="time" value={inicio}/></label>
      <label className="text-sm font-medium text-ink-950">Hora de fin<input className={inputClass} onChange={(event) => setFin(event.target.value)} required type="time" value={fin}/></label>
      {dialog.kind === 'edit' ? <label className="text-sm font-medium text-ink-950 sm:col-span-2">Descripción<textarea className={inputClass} onChange={(event) => setDescripcion(event.target.value)} rows={3} value={descripcion}/></label> : null}
    </div>}
    {validation || error ? <p className="mt-4 text-sm text-red-700" role="alert">{validation ?? error}</p> : null}
    <div className="mt-6 flex flex-wrap gap-3"><button className="admin-primary min-h-11 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Guardando…' : confirmation ? 'Confirmar' : 'Guardar'}</button><button className="admin-secondary min-h-11 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={onCancel} type="button">Volver</button></div>
  </form>
}

function ClinicalDataForm({ entry, busy, error, onSave, onCancel }: {
  entry: AgendaEntry; busy: boolean; error: string | null;
  onSave: (values: ClinicalDataPayload) => Promise<void>; onCancel: () => void
}) {
  const [diagnostico, setDiagnostico] = useState(entry.diagnostico ?? '')
  const [tratamiento, setTratamiento] = useState(entry.tratamiento ?? '')
  const [observacion, setObservacion] = useState(entry.observacion ?? '')
  const [validation, setValidation] = useState<string | null>(null)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (!diagnostico.trim() || !tratamiento.trim()) {
      setValidation('El diagnóstico y el tratamiento son obligatorios.')
      return
    }
    setValidation(null)
    void onSave({ diagnostico: diagnostico.trim(), tratamiento: tratamiento.trim(), observacion: observacion.trim() || null })
  }
  return <form aria-label="Datos clínicos de la cita" noValidate onSubmit={submit}>
    <div className="grid gap-4">
      <label className="text-sm font-medium text-ink-950">Diagnóstico *<textarea aria-describedby={validation && !diagnostico.trim() ? 'clinical-data-error' : undefined} aria-invalid={Boolean(validation && !diagnostico.trim())} className={inputClass} data-dialog-initial onChange={(event) => { setDiagnostico(event.target.value); setValidation(null) }} required rows={3} value={diagnostico}/></label>
      <label className="text-sm font-medium text-ink-950">Tratamiento *<textarea aria-describedby={validation && !tratamiento.trim() ? 'clinical-data-error' : undefined} aria-invalid={Boolean(validation && !tratamiento.trim())} className={inputClass} onChange={(event) => { setTratamiento(event.target.value); setValidation(null) }} required rows={3} value={tratamiento}/></label>
      <label className="text-sm font-medium text-ink-950">Observación<textarea className={inputClass} onChange={(event) => setObservacion(event.target.value)} rows={3} value={observacion}/></label>
    </div>
    {validation || error ? <p className="mt-4 text-sm text-red-700" id={validation ? 'clinical-data-error' : undefined} role="alert">{validation ?? error}</p> : null}
    <div className="mt-6 flex flex-wrap gap-3"><button className="admin-primary min-h-11 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Guardando…' : 'Guardar'}</button><button className="admin-secondary min-h-11 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={onCancel} type="button">Volver</button></div>
  </form>
}

export function MedicalAppointmentsPage() {
  const now = new Date()
  const [month, setMonth] = useState({ year: now.getFullYear(), value: now.getMonth() + 1 })
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [state, setState] = useState<PageState>({ kind: 'loading' })
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pendingMutation = useRef(false)
  const dialogTrigger = useRef<HTMLElement | null>(null)
  const requestId = useRef(0)
  const load = useCallback(async (): Promise<boolean> => {
    const id = ++requestId.current
    setState({ kind: 'loading' })
    try {
      const [entries, pending] = await Promise.all([getAgendaMonth(month.value, month.year), getPendingRequests()])
      if (id === requestId.current) setState({ kind: 'ready', entries, pending })
      return true
    } catch (error) {
      if (id === requestId.current) setState({ kind: 'error', message: errorMessage(error) })
      return false
    }
  }, [month.value, month.year])
  useEffect(() => { const request = requestId; void Promise.resolve().then(load); return () => { request.current++ } }, [load])

  const openDialog = (next: DialogState, trigger: HTMLElement) => { dialogTrigger.current = trigger; setActionError(null); setDialog(next) }
  const closeDialog = () => { if (pendingMutation.current) return; setDialog(null); setActionError(null); dialogTrigger.current?.focus() }
  const save = async (values?: AppointmentValues) => {
    if (!dialog || pendingMutation.current) return
    pendingMutation.current = true; setBusy(true); setActionError(null)
    try {
      let message: string
      if (dialog.kind === 'program' && values) message = await programRequest(dialog.entry.id, { fecha: values.fecha, hora_inicio: values.hora_inicio, hora_fin: values.hora_fin })
      else if (dialog.kind === 'edit' && values) message = await updateAgendaEntry(dialog.entry.id, { fecha: values.fecha, hora_inicio: values.hora_inicio, hora_fin: values.hora_fin, descripcion: values.descripcion ?? null })
      else if (dialog.kind === 'cancel') message = await cancelAppointment(dialog.entry.id)
      else if (dialog.kind === 'complete') message = await completeAppointment(dialog.entry.id)
      else if (dialog.kind === 'delete') message = await deleteAgendaEntry(dialog.entry.id)
      else return
      if (await load()) { setSuccess(message); setDialog(null); dialogTrigger.current?.focus() }
      else setActionError('El cambio se confirmó, pero no fue posible actualizar las citas. Reintenta la consulta.')
    } catch (error) { setActionError(errorMessage(error)) }
    finally { pendingMutation.current = false; setBusy(false) }
  }
  const saveClinical = async (values: ClinicalDataPayload) => {
    if (dialog?.kind !== 'clinical' || pendingMutation.current) return
    pendingMutation.current = true; setBusy(true); setActionError(null)
    try {
      const message = await registerClinicalData(dialog.entry.id, values)
      if (await load()) { setSuccess(message); setDialog(null); dialogTrigger.current?.focus() }
      else setActionError('El cambio se confirmó, pero no fue posible actualizar las citas. Reintenta la consulta.')
    } catch (error) { setActionError(errorMessage(error)) }
    finally { pendingMutation.current = false; setBusy(false) }
  }

  const appointments = state.kind === 'ready' ? state.entries.filter((entry) => entry.tipo === 'cita_medica' && (statusFilter === 'todos' || entry.estado === statusFilter)) : []
  const monthLabel = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' }).format(new Date(month.year, month.value - 1, 1))
  return <div className="admin-reveal max-w-[1390px] space-y-6">
    <header><p className="admin-kicker">Organización clínica</p><h1 className="admin-page-title mt-2">Citas médicas</h1><p className="admin-body mt-2">Consulta y gestión de las citas registradas en el período seleccionado.</p></header>
    {success ? <p className="admin-success rounded-xl p-4 text-sm" role="status">{success}</p> : null}
    <section aria-label="Filtros de citas médicas" className="admin-surface flex flex-wrap items-end gap-4 rounded-[20px] p-5 sm:p-6">
      <label className="min-w-44 flex-1 text-sm font-medium text-ink-950">Mes<input className={inputClass} onChange={(event) => { if (!event.target.value) return; const [year, value] = event.target.value.split('-').map(Number); setMonth({ year, value }) }} type="month" value={`${month.year}-${String(month.value).padStart(2, '0')}`}/></label>
      <label className="min-w-44 flex-1 text-sm font-medium text-ink-950">Estado<select className={inputClass} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} value={statusFilter}><option value="todos">Todos los estados</option>{(Object.keys(statusLabels) as Array<keyof typeof statusLabels>).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
    </section>
    {state.kind === 'loading' ? <LoadingState/> : state.kind === 'error' ? <ErrorState description={state.message} onRetry={() => { void load() }}/> : <>
      <section aria-labelledby="appointments-title" className="admin-surface rounded-[20px] p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="admin-kicker capitalize">{monthLabel}</p><h2 className="mt-2 text-xl font-semibold text-ink-950" id="appointments-title">Citas registradas</h2></div><p className="admin-muted text-sm">Citas encontradas: {appointments.length}</p></div>
        {appointments.length === 0 ? <div className="mt-5"><EmptyState description="No hay citas médicas que coincidan con el mes y estado seleccionados." icon={CalendarDays} title="Sin citas en esta vista"/></div> : <ul className="mt-5 grid gap-3">{appointments.map((entry) => <li className="min-w-0 rounded-xl border border-[#dbe6f2] p-4 sm:p-5" key={entry.id}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-ink-950">{entry.paciente?.nombres ?? 'Paciente no disponible'}</p>{entry.paciente?.codigo_paciente ? <p className="admin-muted text-sm">Código: {entry.paciente.codigo_paciente}</p> : null}</div>{entry.estado ? <span className="admin-pill admin-pill-ready">{statusLabels[entry.estado]}</span> : null}</div>
          <p className="admin-muted mt-3 text-sm">{entry.fecha ? formatDate(entry.fecha) : 'Fecha pendiente'}{entry.hora_inicio && entry.hora_fin ? ` · ${entry.hora_inicio.slice(0, 5)}–${entry.hora_fin.slice(0, 5)}` : null}</p>
          {entry.descripcion ? <p className="admin-body mt-2 text-sm">{entry.descripcion}</p> : null}
          {entry.diagnostico ? <p className="admin-body mt-2 text-sm"><strong className="text-ink-950">Diagnóstico:</strong> {entry.diagnostico}</p> : null}
          {entry.tratamiento ? <p className="admin-body mt-1 text-sm"><strong className="text-ink-950">Tratamiento:</strong> {entry.tratamiento}</p> : null}
          {entry.observacion ? <p className="admin-body mt-1 text-sm"><strong className="text-ink-950">Observación:</strong> {entry.observacion}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">{entry.estado !== 'pendiente' ? <button className="admin-secondary min-h-10 rounded-lg px-3 text-xs font-semibold" onClick={(event) => openDialog({ kind: 'edit', entry }, event.currentTarget)} type="button">Editar</button> : null}{entry.estado === 'programada' || entry.estado === 'completada' ? <button className="admin-secondary min-h-10 rounded-lg px-3 text-xs font-semibold" onClick={(event) => openDialog({ kind: 'clinical', entry }, event.currentTarget)} type="button">{clinicalActionLabel(entry)}</button> : null}{entry.estado === 'programada' ? <><button className="admin-secondary min-h-10 rounded-lg px-3 text-xs font-semibold" onClick={(event) => openDialog({ kind: 'cancel', entry }, event.currentTarget)} type="button">Cancelar cita</button><button className="admin-secondary min-h-10 rounded-lg px-3 text-xs font-semibold" onClick={(event) => openDialog({ kind: 'complete', entry }, event.currentTarget)} type="button">Completar cita</button></> : null}<button className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700" onClick={(event) => openDialog({ kind: 'delete', entry }, event.currentTarget)} type="button">Eliminar</button></div>
        </li>)}</ul>}
      </section>
      {state.pending.length > 0 ? <section aria-labelledby="pending-requests-title" className="admin-surface rounded-[20px] p-5 sm:p-6"><h2 className="text-xl font-semibold text-ink-950" id="pending-requests-title">Solicitudes pendientes</h2><ul className="mt-4 grid gap-3 md:grid-cols-2">{state.pending.map((entry) => <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dbe6f2] p-4" key={entry.id}><div><p className="font-semibold text-ink-950">{entry.paciente?.nombres ?? 'Paciente no disponible'}</p>{entry.paciente?.codigo_paciente ? <p className="admin-muted text-sm">Código: {entry.paciente.codigo_paciente}</p> : null}</div><button className="admin-primary min-h-11 rounded-lg px-4 text-sm font-semibold" onClick={(event) => openDialog({ kind: 'program', entry }, event.currentTarget)} type="button">Programar</button></li>)}</ul></section> : null}
    </>}
    {dialog ? <AccessibleDialog busy={busy} onClose={closeDialog} title={dialog.kind === 'clinical' ? clinicalActionLabel(dialog.entry) : dialogTitles[dialog.kind]} titleId="appointment-dialog-title">{dialog.kind === 'clinical' ? <ClinicalDataForm busy={busy} entry={dialog.entry} error={actionError} key={dialog.entry.id} onCancel={closeDialog} onSave={saveClinical}/> : <AppointmentDialogForm busy={busy} dialog={dialog} error={actionError} key={`${dialog.kind}-${dialog.entry.id}`} onCancel={closeDialog} onSave={save}/>}</AccessibleDialog> : null}
  </div>
}
