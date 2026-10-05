import { isAxiosError } from 'axios'
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { formatDate } from '../../utils/displayFormat'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { getPatients, type Patient } from '../patients/patientService'
import { cancelAppointment, completeAppointment, createMedicalAppointment, createPersonalEntry, deleteAgendaEntry, getAgendaMonth, getPendingRequests, programRequest, registerClinicalData, updateAgendaEntry, type AgendaEntry, type AgendaSlot, type ClinicalDataPayload } from './agendaService'

type DialogKind = 'personal' | 'medical' | 'program' | 'edit' | 'cancel' | 'complete' | 'delete' | 'clinical'
type DialogState = { kind: DialogKind; entry?: AgendaEntry }
type AgendaState = { kind: 'loading' } | { kind: 'ready'; entries: AgendaEntry[]; pending: AgendaEntry[] } | { kind: 'error'; message: string }
const two = (value: number) => String(value).padStart(2, '0')
const dateKey = (year: number, month: number, day: number) => `${year}-${two(month)}-${two(day)}`
const inputClass = 'admin-input mt-1 w-full text-sm'
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

function AgendaDialogContent({ dialog, selectedDate, patients, patientError, busy, error, onSave, onCancel }: {
  dialog: DialogState; selectedDate: string; patients: Patient[]; patientError: string | null; busy: boolean; error: string | null;
  onSave: (values?: AgendaSlot & { descripcion?: string | null; codigo_paciente?: string }) => Promise<void>; onCancel: () => void
}) {
  const [fecha, setFecha] = useState(dialog.entry?.fecha?.slice(0, 10) ?? selectedDate)
  const [inicio, setInicio] = useState(dialog.entry?.hora_inicio?.slice(0, 5) ?? '')
  const [fin, setFin] = useState(dialog.entry?.hora_fin?.slice(0, 5) ?? '')
  const [descripcion, setDescripcion] = useState(dialog.entry?.descripcion ?? '')
  const [codigo, setCodigo] = useState('')
  const [validation, setValidation] = useState<string | null>(null)
  const confirmation = ['cancel', 'complete', 'delete'].includes(dialog.kind)
  const editing = dialog.kind === 'edit'
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (confirmation) { void onSave(); return }
    if (!(editing ? fecha : selectedDate) || !inicio || !fin || fin <= inicio) { setValidation('Revisa la fecha y el horario. La hora final debe ser posterior a la inicial.'); return }
    if (dialog.kind === 'personal' && !descripcion.trim()) { setValidation('La descripción es obligatoria.'); return }
    if (dialog.kind === 'medical' && !codigo) { setValidation('Selecciona un paciente registrado.'); return }
    const slot = { fecha: editing ? fecha : selectedDate, hora_inicio: inicio, hora_fin: fin }
    if (dialog.kind === 'personal') void onSave({ ...slot, descripcion: descripcion.trim() })
    else if (dialog.kind === 'medical') void onSave({ ...slot, codigo_paciente: codigo, descripcion: descripcion.trim() || null })
    else if (dialog.kind === 'edit') void onSave({ ...slot, descripcion: descripcion.trim() || null })
    else void onSave(slot)
  }
  return <form aria-label={dialog.kind === 'program' ? 'Programar solicitud' : 'Datos de agenda'} noValidate onSubmit={submit}>
    {confirmation ? <p className="admin-body text-sm">{dialog.kind === 'delete' ? '¿Eliminar este registro de agenda?' : dialog.kind === 'cancel' ? '¿Cancelar esta cita médica?' : '¿Completar esta cita médica? El backend requiere diagnóstico y tratamiento registrados previamente.'}</p> : <div className="grid gap-4 sm:grid-cols-2">
      {dialog.kind === 'medical' ? <label className="text-sm font-medium text-ink-950 sm:col-span-2">Paciente
        <select className={inputClass} data-dialog-initial onChange={(event) => setCodigo(event.target.value)} required value={codigo}><option value="">Seleccionar paciente</option>{patients.map((patient) => <option key={patient.id} value={patient.codigo_paciente}>{patient.nombres} · {patient.codigo_paciente}</option>)}</select>
        {patientError ? <span className="mt-1 block text-sm text-red-700" role="alert">{patientError}</span> : null}
      </label> : null}
      {editing ? <label className="text-sm font-medium text-ink-950">Fecha<input className={inputClass} data-dialog-initial onChange={(event) => setFecha(event.target.value)} required type="date" value={fecha}/></label> : <p className="text-sm font-medium text-ink-950 sm:col-span-2">Fecha seleccionada: <strong>{formatDate(selectedDate)}</strong></p>}
      <label className="text-sm font-medium text-ink-950">Hora de inicio<input className={inputClass} data-dialog-initial={!editing && dialog.kind !== 'medical' ? '' : undefined} onChange={(event) => setInicio(event.target.value)} required type="time" value={inicio}/></label>
      <label className="text-sm font-medium text-ink-950">Hora de fin<input className={inputClass} onChange={(event) => setFin(event.target.value)} required type="time" value={fin}/></label>
      {dialog.kind !== 'program' ? <label className="text-sm font-medium text-ink-950 sm:col-span-2">Descripción<textarea className={inputClass} onChange={(event) => setDescripcion(event.target.value)} rows={3} value={descripcion}/></label> : null}
    </div>}
    {validation || error ? <p className="mt-4 text-sm text-red-700" role="alert">{validation ?? error}</p> : null}
    <div className="mt-6 flex flex-wrap gap-3"><button className="admin-primary min-h-11 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy || Boolean(patientError)} type="submit">{busy ? 'Guardando…' : confirmation ? 'Confirmar' : 'Guardar'}</button><button className="admin-secondary min-h-11 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={onCancel} type="button">Volver</button></div>
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

const dialogTitles: Record<DialogKind, string> = { personal: 'Actividad personal', medical: 'Cita médica', program: 'Programar solicitud', edit: 'Editar registro', cancel: 'Cancelar cita médica', complete: 'Completar cita médica', delete: 'Eliminar registro', clinical: 'Datos clínicos' }

export function AgendaPage() {
  const now = new Date()
  const [month, setMonth] = useState({ year: now.getFullYear(), value: now.getMonth() + 1 })
  const [selectedDate, setSelectedDate] = useState(dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate()))
  const [daySelected, setDaySelected] = useState(false)
  const [state, setState] = useState<AgendaState>({ kind: 'loading' })
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientError, setPatientError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pendingMutation = useRef(false)
  const dialogTrigger = useRef<HTMLElement | null>(null)
  const requestId = useRef(0)
  const load = useCallback(async () => {
    const id = ++requestId.current
    setState({ kind: 'loading' })
    try {
      const [entries, pending] = await Promise.all([getAgendaMonth(month.value, month.year), getPendingRequests()])
      if (id === requestId.current) setState({ kind: 'ready', entries, pending })
    } catch (error) {
      if (id === requestId.current) setState({ kind: 'error', message: errorMessage(error) })
    }
  }, [month.value, month.year])
  useEffect(() => {
    let active = true
    const currentRequest = requestId
    void Promise.resolve().then(() => { if (active) return load() })
    return () => { active = false; currentRequest.current++ }
  }, [load])

  const openDialog = (next: DialogState, trigger: HTMLElement) => {
    dialogTrigger.current = trigger
    setActionError(null)
    setPatientError(null)
    setPatients([])
    setDialog(next)
    if (next.kind === 'medical') void getPatients().then(setPatients, (error: unknown) => setPatientError(errorMessage(error)))
  }
  const closeDialog = () => { if (pendingMutation.current) return; setDialog(null); setActionError(null); dialogTrigger.current?.focus() }
  const save = async (values?: AgendaSlot & { descripcion?: string | null; codigo_paciente?: string }) => {
    if (!dialog || pendingMutation.current) return
    pendingMutation.current = true
    setBusy(true)
    setActionError(null)
    try {
      let message: string
      if (dialog.kind === 'personal' && values) message = await createPersonalEntry({ fecha: values.fecha, hora_inicio: values.hora_inicio, hora_fin: values.hora_fin, descripcion: values.descripcion ?? '' })
      else if (dialog.kind === 'medical' && values) message = await createMedicalAppointment({ fecha: values.fecha, hora_inicio: values.hora_inicio, hora_fin: values.hora_fin, codigo_paciente: values.codigo_paciente ?? '', descripcion: values.descripcion ?? null })
      else if (dialog.kind === 'program' && dialog.entry && values) message = await programRequest(dialog.entry.id, { fecha: values.fecha, hora_inicio: values.hora_inicio, hora_fin: values.hora_fin })
      else if (dialog.kind === 'edit' && dialog.entry && values) message = await updateAgendaEntry(dialog.entry.id, { fecha: values.fecha, hora_inicio: values.hora_inicio, hora_fin: values.hora_fin, descripcion: values.descripcion ?? null })
      else if (dialog.kind === 'cancel' && dialog.entry) message = await cancelAppointment(dialog.entry.id)
      else if (dialog.kind === 'complete' && dialog.entry) message = await completeAppointment(dialog.entry.id)
      else if (dialog.kind === 'delete' && dialog.entry) message = await deleteAgendaEntry(dialog.entry.id)
      else return
      await load()
      setSuccess(message)
      setDialog(null)
      dialogTrigger.current?.focus()
    } catch (error) { setActionError(errorMessage(error)) }
    finally { pendingMutation.current = false; setBusy(false) }
  }
  const saveClinical = async (values: ClinicalDataPayload) => {
    if (dialog?.kind !== 'clinical' || !dialog.entry || pendingMutation.current) return
    pendingMutation.current = true
    setBusy(true)
    setActionError(null)
    try {
      const message = await registerClinicalData(dialog.entry.id, values)
      await load()
      setSuccess(message)
      setDialog(null)
      dialogTrigger.current?.focus()
    } catch (error) { setActionError(errorMessage(error)) }
    finally { pendingMutation.current = false; setBusy(false) }
  }

  const shiftMonth = (change: number) => {
    const next = new Date(month.year, month.value - 1 + change, 1)
    setMonth({ year: next.getFullYear(), value: next.getMonth() + 1 })
    setSelectedDate(dateKey(next.getFullYear(), next.getMonth() + 1, 1))
    setDaySelected(false)
  }
  const dayCount = new Date(month.year, month.value, 0).getDate()
  const offset = (new Date(month.year, month.value - 1, 1).getDay() + 6) % 7
  const days = Array.from({ length: dayCount }, (_, index) => index + 1)
  const selectedEntries = state.kind === 'ready' ? state.entries.filter((entry) => entry.fecha?.slice(0, 10) === selectedDate) : []
  const monthLabel = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' }).format(new Date(month.year, month.value - 1, 1))
  return <div className="admin-reveal max-w-[1390px] space-y-6">
    <header><p className="admin-kicker">Organización clínica</p><h1 className="admin-page-title mt-2">Agenda</h1><p className="admin-body mt-2">Calendario y solicitudes recibidas por la doctora.</p></header>
    {success ? <p className="admin-success rounded-xl p-4 text-sm" role="status">{success}</p> : null}
    {state.kind === 'error' ? <ErrorState description={state.message} onRetry={() => { void load() }}/ > : null}
    <div className="flex flex-wrap items-center justify-end gap-3"><div className="flex items-center gap-2"><button aria-label="Mes anterior" className="admin-secondary grid size-11 place-items-center rounded-lg" onClick={() => shiftMonth(-1)} type="button"><ChevronLeft size={18}/></button><label className="text-xs font-semibold text-ink-950">Mes<input aria-label="Mes" className="admin-input ml-2 text-sm" onChange={(event) => { if (!event.target.value) return; const [year, value] = event.target.value.split('-').map(Number); setMonth({ year, value }); setSelectedDate(dateKey(year, value, 1)); setDaySelected(false) }} type="month" value={`${month.year}-${two(month.value)}`}/></label><button aria-label="Mes siguiente" className="admin-secondary grid size-11 place-items-center rounded-lg" onClick={() => shiftMonth(1)} type="button"><ChevronRight size={18}/></button></div></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(290px,.8fr)]"><section aria-label={`Calendario de ${monthLabel}`} className="admin-surface min-w-0 rounded-[20px] p-4 sm:p-6"><h2 className="mb-5 flex items-center gap-2 text-xl font-bold capitalize text-ink-950"><CalendarDays aria-hidden="true" size={21}/>{monthLabel}</h2><div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#526a87] sm:gap-2">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, index) => <span key={index}>{label}</span>)}{Array.from({ length: offset }, (_, index) => <span aria-hidden="true" key={`empty-${index}`}/>)}{days.map((day) => { const key = dateKey(month.year, month.value, day); const records = state.kind === 'ready' ? state.entries.filter((entry) => entry.fecha?.slice(0, 10) === key) : []; return <button aria-label={`Seleccionar ${day} de ${monthLabel}`} aria-pressed={daySelected && selectedDate === key} className={`min-h-16 rounded-lg border p-1 text-left align-top transition-colors sm:min-h-24 sm:p-2 ${daySelected && selectedDate === key ? 'border-clinic-600 bg-clinic-50' : 'border-[#dbe6f2] hover:bg-[#f3f8fe]'}`} key={key} onClick={() => { setSelectedDate(key); setDaySelected(true) }} type="button"><span className="block text-sm font-bold text-ink-950">{day}</span>{records.length ? <span className="mt-1 block truncate text-[10px] font-medium text-clinic-700 sm:text-xs">{records[0].descripcion || (records[0].tipo === 'cita_medica' ? 'Cita médica' : 'Actividad personal')}{records.length > 1 ? ` · +${records.length - 1}` : ''}</span> : null}</button> })}</div></section><section aria-labelledby="selected-day-title" className="admin-surface rounded-[20px] p-5 sm:p-6"><p className="admin-kicker">Día seleccionado</p><h2 className="mt-2 text-xl font-bold text-ink-950" id="selected-day-title">{daySelected ? formatDate(selectedDate) : 'Selecciona un día'}</h2>{daySelected ? <div className="mt-4 flex flex-wrap gap-2"><button className="admin-primary min-h-11 rounded-[10px] px-4 text-sm font-semibold" onClick={(event) => openDialog({ kind: 'medical' }, event.currentTarget)} type="button"><Plus aria-hidden="true" className="mr-1 inline" size={16}/>Cita médica</button><button className="admin-secondary min-h-11 rounded-[10px] px-4 text-sm font-semibold" onClick={(event) => openDialog({ kind: 'personal' }, event.currentTarget)} type="button">Actividad personal</button></div> : <p className="admin-muted mt-3 text-sm">Selecciona un día del calendario para ver su agenda y crear registros.</p>}{!daySelected ? null : state.kind === 'loading' ? <LoadingState/> : state.kind === 'error' ? null : selectedEntries.length === 0 ? <p className="admin-muted mt-5 text-sm">Sin registros para este día.</p> : <ul className="mt-5 space-y-3">{selectedEntries.map((entry) => <li className="rounded-xl border border-[#dbe6f2] p-4" key={entry.id}><span className="admin-pill admin-pill-ready">{entry.tipo === 'personal' ? 'Actividad personal' : 'Cita médica'}</span><p className="mt-2 font-semibold text-ink-950">{entry.descripcion || (entry.tipo === 'cita_medica' ? entry.paciente?.nombres ?? 'Cita médica' : 'Actividad personal')}</p><p className="admin-muted mt-1 text-sm">{entry.hora_inicio?.slice(0, 5)}–{entry.hora_fin?.slice(0, 5)}{entry.paciente ? ` · ${entry.paciente.nombres}` : ''}</p>{entry.estado ? <p className="admin-muted mt-1 text-xs">Estado: {entry.estado}</p> : null}<div className="mt-3 flex flex-wrap gap-2">{entry.estado !== 'pendiente' ? <button className="admin-secondary min-h-10 rounded-lg px-3 text-xs font-semibold" onClick={(event) => openDialog({ kind: 'edit', entry }, event.currentTarget)} type="button">Editar</button> : null}{entry.tipo === 'cita_medica' && (entry.estado === 'programada' || entry.estado === 'completada') ? <button className="admin-secondary min-h-10 rounded-lg px-3 text-xs font-semibold" onClick={(event) => openDialog({ kind: 'clinical', entry }, event.currentTarget)} type="button">{clinicalActionLabel(entry)}</button> : null}{entry.tipo === 'cita_medica' && entry.estado === 'programada' ? <><button className="admin-secondary min-h-10 rounded-lg px-3 text-xs font-semibold" onClick={(event) => openDialog({ kind: 'cancel', entry }, event.currentTarget)} type="button">Cancelar cita</button><button className="admin-secondary min-h-10 rounded-lg px-3 text-xs font-semibold" onClick={(event) => openDialog({ kind: 'complete', entry }, event.currentTarget)} type="button">Completar cita</button></> : null}<button className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700" onClick={(event) => openDialog({ kind: 'delete', entry }, event.currentTarget)} type="button">Eliminar</button></div></li>)}</ul>}</section></div>
    {state.kind === 'ready' && state.pending.length > 0 ? <section aria-labelledby="pending-requests-title" className="admin-surface rounded-[20px] p-5 sm:p-6"><h2 className="text-xl font-bold text-ink-950" id="pending-requests-title">Solicitudes pendientes</h2><ul className="mt-4 grid gap-3 md:grid-cols-2">{state.pending.map((entry) => <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dbe6f2] p-4" key={entry.id}><div><p className="font-semibold text-ink-950">{entry.paciente?.nombres ?? 'Paciente no disponible'}</p><p className="admin-muted text-sm">{entry.paciente?.codigo_paciente} · {entry.estado}</p></div><button className="admin-primary min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-60" disabled={!daySelected} onClick={(event) => openDialog({ kind: 'program', entry }, event.currentTarget)} type="button">Programar</button></li>)}</ul></section> : null}
    {dialog ? <AccessibleDialog busy={busy} onClose={closeDialog} title={dialog.kind === 'clinical' && dialog.entry ? clinicalActionLabel(dialog.entry) : dialogTitles[dialog.kind]} titleId="agenda-dialog-title">{dialog.kind === 'clinical' && dialog.entry ? <ClinicalDataForm busy={busy} entry={dialog.entry} error={actionError} key={dialog.entry.id} onCancel={closeDialog} onSave={saveClinical}/> : <AgendaDialogContent busy={busy} dialog={dialog} error={actionError} key={`${dialog.kind}-${dialog.entry?.id ?? ''}`} onCancel={closeDialog} onSave={save} patientError={patientError} patients={patients} selectedDate={selectedDate}/>}</AccessibleDialog> : null}
  </div>
}
