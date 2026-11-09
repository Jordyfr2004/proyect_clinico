import { isAxiosError } from 'axios'
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { formatDate } from '../../utils/displayFormat'
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Clock3, FileText, HeartPulse, MoreVertical, Save, Search, Stethoscope, UserRound, X } from 'lucide-react'
import { cancelAppointment, completeAppointment, deleteAgendaEntry, getAgendaMonth, getPendingRequests, programRequest, registerClinicalData, updateAgendaEntry, type AgendaEntry, type AgendaSlot, type ClinicalDataPayload, type CompleteAppointmentPayload } from '../agenda/agendaService'
import { markClinicalQueriesStale, useClinicalQuery } from '../../services/clinicalQuery'
import { useClinicalViewState } from '../../services/clinicalViewState'
import './medical-appointments.css'

type PageState = { kind: 'loading' } | { kind: 'ready'; entries: AgendaEntry[]; pending: AgendaEntry[] } | { kind: 'error'; message: string }
type DialogKind = 'program' | 'edit' | 'clinical' | 'cancel' | 'complete' | 'delete'
type DialogState = { kind: DialogKind; entry: AgendaEntry }
type StatusFilter = 'todos' | NonNullable<AgendaEntry['estado']>
type AppointmentValues = AgendaSlot & { descripcion?: string | null }
const inputClass = 'admin-input mt-1 w-full text-sm'
const statusLabels: Record<NonNullable<AgendaEntry['estado']>, string> = {
  pendiente: 'Pendiente', programada: 'Programada', cancelada: 'Cancelada', completada: 'Completada',
}
const statusClasses: Record<NonNullable<AgendaEntry['estado']>, string> = {
  pendiente: 'admin-pill-pending', programada: 'admin-pill-ready',
  cancelada: 'admin-pill-cancelled', completada: 'admin-pill-completed',
}
const dialogTitles: Record<DialogKind, string> = {
  program: 'Programar solicitud', edit: 'Editar cita médica', clinical: 'Datos clínicos',
  cancel: 'Cancelar cita médica', complete: 'Completar cita médica', delete: 'Eliminar registro',
}
const hasClinicalData = (entry: AgendaEntry) => Boolean(entry.diagnostico?.trim() && entry.tratamiento?.trim())
const clinicalActionLabel = (entry: AgendaEntry) => entry.estado === 'completada' || hasClinicalData(entry) ? 'Editar datos clínicos' : 'Registrar datos clínicos'
const primaryAction = (entry: AgendaEntry): 'clinical' | 'complete' | null => {
  if (entry.estado === 'completada') return 'clinical'
  if (entry.estado !== 'programada') return null
  return hasClinicalData(entry) ? 'complete' : 'clinical'
}
const two = (value: number) => String(value).padStart(2, '0')
const dateKey = (date: Date) => `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`

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

function ProgramRequestCalendar({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const today = new Date()
  const initial = value ? new Date(`${value}T12:00:00`) : today
  const [visibleMonth, setVisibleMonth] = useState({ year: initial.getFullYear(), month: initial.getMonth() + 1 })
  const [focusedDate, setFocusedDate] = useState(value || dateKey(today))
  const calendarRef = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef<string | null>(null)
  const monthPrefix = `${visibleMonth.year}-${two(visibleMonth.month)}`
  const monthLabel = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' }).format(new Date(visibleMonth.year, visibleMonth.month - 1, 1))
  const dayCount = new Date(visibleMonth.year, visibleMonth.month, 0).getDate()
  const offset = (new Date(visibleMonth.year, visibleMonth.month - 1, 1).getDay() + 6) % 7
  const tabStop = focusedDate.startsWith(monthPrefix) ? focusedDate : value.startsWith(monthPrefix) ? value : dateKey(new Date(visibleMonth.year, visibleMonth.month - 1, 1))

  useEffect(() => {
    if (!pendingFocus.current) return
    calendarRef.current?.querySelector<HTMLButtonElement>(`[data-calendar-day="${pendingFocus.current}"]`)?.focus()
    pendingFocus.current = null
  }, [focusedDate, visibleMonth])

  const shiftMonth = (change: number) => {
    const next = new Date(visibleMonth.year, visibleMonth.month - 1 + change, 1)
    setVisibleMonth({ year: next.getFullYear(), month: next.getMonth() + 1 })
    setFocusedDate(dateKey(next))
  }
  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, day: number) => {
    const shifts: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    let next: Date
    if (event.key in shifts) next = new Date(visibleMonth.year, visibleMonth.month - 1, day + shifts[event.key])
    else if (event.key === 'Home') next = new Date(visibleMonth.year, visibleMonth.month - 1, day - ((offset + day - 1) % 7))
    else if (event.key === 'End') next = new Date(visibleMonth.year, visibleMonth.month - 1, day + (6 - ((offset + day - 1) % 7)))
    else return
    event.preventDefault()
    const key = dateKey(next)
    pendingFocus.current = key
    setFocusedDate(key)
    if (next.getMonth() + 1 !== visibleMonth.month || next.getFullYear() !== visibleMonth.year) setVisibleMonth({ year: next.getFullYear(), month: next.getMonth() + 1 })
  }

  return <div aria-label="Fecha" className="sm:col-span-2" ref={calendarRef} role="group">
    <p className="text-sm font-medium text-ink-950">Fecha</p>
    <div className="mt-1 rounded-xl border border-[#dbe6f2] bg-[#fbfdff] p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2"><button aria-label="Mes anterior" className="admin-secondary grid size-10 place-items-center rounded-lg" onClick={() => shiftMonth(-1)} type="button"><ChevronLeft aria-hidden="true" size={18}/></button><p aria-live="polite" className="text-sm font-bold capitalize text-ink-950">{monthLabel}</p><button aria-label="Mes siguiente" className="admin-secondary grid size-10 place-items-center rounded-lg" onClick={() => shiftMonth(1)} type="button"><ChevronRight aria-hidden="true" size={18}/></button></div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#526a87]">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, index) => <span aria-hidden="true" key={index}>{label}</span>)}{Array.from({ length: offset }, (_, index) => <span aria-hidden="true" key={`empty-${index}`}/>)}{Array.from({ length: dayCount }, (_, index) => {
        const day = index + 1
        const key = `${monthPrefix}-${two(day)}`
        const selected = value === key
        const isToday = dateKey(today) === key
        return <button aria-current={isToday ? 'date' : undefined} aria-label={`Seleccionar ${day} de ${monthLabel}`} aria-pressed={selected} className={`min-h-10 rounded-lg border text-sm font-semibold transition-colors sm:min-h-11 ${selected ? 'border-clinic-600 bg-clinic-50 text-clinic-700 ring-1 ring-clinic-600' : isToday ? 'border-sky-400 bg-sky-50 text-ink-950 hover:bg-sky-100' : 'border-[#dbe6f2] bg-white text-ink-950 hover:bg-[#f3f8fe]'}`} data-calendar-day={key} data-dialog-initial={key === tabStop ? true : undefined} key={key} onClick={() => { setFocusedDate(key); onChange(key) }} onKeyDown={(event) => moveFocus(event, day)} tabIndex={key === tabStop ? 0 : -1} type="button">{day}</button>
      })}</div>
    </div>
    <p className="admin-muted mt-2 text-xs">{value ? `Fecha seleccionada: ${formatDate(value)}` : 'Selecciona un día para programar la solicitud.'}</p>
  </div>
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
  const confirmation = ['cancel', 'delete'].includes(dialog.kind)
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
  return <form aria-label={dialog.kind === 'program' ? 'Programar solicitud' : 'Datos de agenda'} className={`medical-appointment-form${dialog.kind === 'edit' ? ' medical-appointment-edit' : ''}`} noValidate onSubmit={submit}>
    {confirmation ? <p className="admin-body text-sm">{dialog.kind === 'delete' ? '¿Eliminar este registro de agenda?' : '¿Cancelar esta cita médica?'}</p> : <div className="grid gap-4 sm:grid-cols-2">
      {dialog.kind === 'edit' ? <><p className="admin-muted text-sm sm:col-span-2">Modifica la fecha, el horario o la descripción de la cita.</p><label className="text-sm font-medium text-ink-950 sm:col-span-2">Fecha de la cita *<input className={inputClass} data-dialog-initial onChange={(event) => setFecha(event.target.value)} required type="date" value={fecha}/></label></> : <ProgramRequestCalendar onChange={setFecha} value={fecha}/>}
      <label className="text-sm font-medium text-ink-950">Hora de inicio<input className={inputClass} onChange={(event) => setInicio(event.target.value)} required type="time" value={inicio}/></label>
      <label className="text-sm font-medium text-ink-950">Hora de fin<input className={inputClass} onChange={(event) => setFin(event.target.value)} required type="time" value={fin}/></label>
      {dialog.kind === 'edit' ? <label className="text-sm font-medium text-ink-950 sm:col-span-2">Descripción<textarea className={inputClass} onChange={(event) => setDescripcion(event.target.value)} rows={3} value={descripcion}/></label> : null}
    </div>}
    {validation || error ? <p className="mt-4 text-sm text-red-700" role="alert">{validation ?? error}</p> : null}
    <div className={`medical-appointment-form-actions sticky bottom-0 z-10 flex flex-wrap gap-3 border-t border-[#e3ecf6] bg-white ${dialog.kind === 'edit' ? 'mt-5 pt-4' : 'mt-6 pt-5'}`}><button className="admin-primary flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} type="submit">{dialog.kind === 'edit' ? <Save aria-hidden="true" size={16}/> : null}{busy ? 'Guardando…' : confirmation ? 'Confirmar' : dialog.kind === 'edit' ? 'Guardar cambios' : 'Guardar'}</button><button className="admin-secondary flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={onCancel} type="button">{dialog.kind === 'edit' ? <X aria-hidden="true" size={16}/> : null}Cancelar</button></div>
  </form>
}

function CompleteAppointmentForm({ busy, error, onSave, onCancel }: {
  busy: boolean; error: string | null;
  onSave: (values: CompleteAppointmentPayload) => Promise<void>; onCancel: () => void
}) {
  const [actividad, setActividad] = useState('')
  const [precio, setPrecio] = useState('')
  const [validation, setValidation] = useState<string | null>(null)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const name = actividad.trim()
    if (!name || name.length > 255) { setValidation('Indica la actividad realizada (máximo 255 caracteres).'); return }
    const amount = Number(precio)
    if (!/^\d+(?:\.\d{1,2})?$/.test(precio) || !Number.isFinite(amount) || amount > 99999999.99) {
      setValidation('Ingresa un precio válido con hasta dos decimales.'); return
    }
    setValidation(null)
    void onSave({ actividad: name, precio: amount })
  }
  return <form aria-label="Actividad realizada en la cita" className="medical-appointment-form" noValidate onSubmit={submit}>
    <p className="admin-body text-sm">Al completar la cita, la actividad y su precio aparecerán en Actividades. El diagnóstico y el tratamiento deben estar registrados.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_170px]">
      <label className="text-sm font-medium text-ink-950">Actividad realizada<input className={inputClass} data-dialog-initial disabled={busy} maxLength={255} onChange={(event) => { setActividad(event.target.value); setValidation(null) }} placeholder="Ej. limpieza dental" type="text" value={actividad}/></label>
      <label className="text-sm font-medium text-ink-950">Precio<input className={inputClass} disabled={busy} inputMode="decimal" max="99999999.99" min="0" onChange={(event) => { setPrecio(event.target.value); setValidation(null) }} placeholder="0.00" step="0.01" type="number" value={precio}/></label>
    </div>
    {validation || error ? <p className="mt-4 text-sm text-red-700" role="alert">{validation ?? error}</p> : null}
    <div className="mt-6 flex flex-wrap gap-3"><button className="admin-primary min-h-11 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Guardando…' : 'Completar cita'}</button><button className="admin-secondary min-h-11 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={onCancel} type="button">Volver</button></div>
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
  return <form aria-label="Datos clínicos de la cita" className="medical-appointment-form medical-appointment-clinical" noValidate onSubmit={submit}>
    <p className="admin-muted mb-4 flex items-center gap-2 text-sm"><Stethoscope aria-hidden="true" className="text-clinic-600" size={18}/> Actualiza el diagnóstico, tratamiento y observación.</p>
    <div className="mb-5 grid gap-2 sm:grid-cols-2">
      <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[#dbe6f2] bg-[#f5f9fe] px-3 py-3"><UserRound aria-hidden="true" className="shrink-0 text-clinic-600" size={20}/><div className="min-w-0"><p className="truncate font-semibold text-ink-950">{entry.paciente?.nombres ?? 'Paciente no disponible'}</p><p className="admin-muted text-xs">Código: {entry.paciente?.codigo_paciente ?? 'No disponible'}</p></div></div>
      <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[#dbe6f2] bg-[#f5f9fe] px-3 py-3"><CalendarDays aria-hidden="true" className="shrink-0 text-clinic-600" size={20}/><div className="min-w-0"><p className="admin-muted text-xs">Fecha de la cita</p><p className="font-semibold text-ink-950">{entry.fecha ? formatDate(entry.fecha) : 'Fecha no disponible'}</p></div></div>
    </div>
    <div className="grid gap-4">
      <label className="text-sm font-medium text-ink-950">Diagnóstico * <span className="admin-muted font-normal">(obligatorio)</span><textarea aria-describedby={validation && !diagnostico.trim() ? 'clinical-data-error' : undefined} aria-invalid={Boolean(validation && !diagnostico.trim())} className={inputClass} data-dialog-initial onChange={(event) => { setDiagnostico(event.target.value); setValidation(null) }} required rows={2} value={diagnostico}/></label>
      <label className="text-sm font-medium text-ink-950">Tratamiento * <span className="admin-muted font-normal">(obligatorio)</span><textarea aria-describedby={validation && !tratamiento.trim() ? 'clinical-data-error' : undefined} aria-invalid={Boolean(validation && !tratamiento.trim())} className={inputClass} onChange={(event) => { setTratamiento(event.target.value); setValidation(null) }} required rows={2} value={tratamiento}/></label>
      <label className="text-sm font-medium text-ink-950">Observación <span className="admin-muted font-normal">(opcional)</span><textarea className={inputClass} onChange={(event) => setObservacion(event.target.value)} rows={2} value={observacion}/></label>
    </div>
    {validation || error ? <p className="mt-4 text-sm text-red-700" id={validation ? 'clinical-data-error' : undefined} role="alert">{validation ?? error}</p> : null}
    <div className="medical-appointment-form-actions mt-5 flex flex-wrap gap-3 border-t border-[#e3ecf6] pt-5"><button className="admin-primary flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} type="submit"><Save aria-hidden="true" size={16}/>{busy ? 'Guardando…' : 'Guardar cambios'}</button><button className="admin-secondary flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={onCancel} type="button"><X aria-hidden="true" size={16}/>Cancelar</button></div>
  </form>
}

function AppointmentDetails({ entry, onClose, onAction }: {
  entry: AgendaEntry; onClose: () => void; onAction: (kind: DialogKind, trigger: HTMLElement) => void
}) {
  const panelRef = useRef<HTMLElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [exiting, setExiting] = useState(false)
  const action = primaryAction(entry)
  const requestClose = useCallback(() => {
    if (closeTimer.current) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true) { onClose(); return }
    setExiting(true)
    closeTimer.current = setTimeout(onClose, 290)
  }, [onClose])
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('[data-detail-initial]')?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (document.querySelector('[aria-modal="true"]')) return
      if (event.key === 'Escape') { event.preventDefault(); requestClose() }
      if (event.key !== 'Tab' || !panelRef.current) return
      const controls = [...panelRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]')]
      if (!controls.length) return
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus() }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus() }
    }
    document.addEventListener('keydown', onEscape)
    return () => { document.removeEventListener('keydown', onEscape); document.body.style.overflow = previousOverflow }
  }, [entry.id, requestClose])

  return createPortal(<>
    <button aria-label="Cerrar detalles de la cita" className="medical-appointment-backdrop fixed inset-0 z-40 bg-[#061e3c]/45" data-exiting={exiting} onClick={requestClose} tabIndex={-1} type="button"/>
    <aside aria-label="Detalles de la cita" className="medical-appointment-panel fixed inset-y-0 right-0 z-[45] flex w-full flex-col overflow-hidden border-l border-[#dbe6f2] bg-white shadow-[-18px_0_48px_rgba(16,51,93,.18)] sm:w-[min(510px,100vw)] sm:rounded-l-[20px]" data-exiting={exiting} ref={panelRef} role="region">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e3ecf6] bg-[#f6faff] px-5 py-4 sm:px-6"><div><h3 className="text-xl font-bold text-ink-950">Detalles de la cita</h3><p className="admin-muted mt-1 text-sm">Información clínica del paciente.</p></div><button aria-label="Cerrar detalles" className="admin-secondary grid size-10 shrink-0 place-items-center rounded-lg" data-detail-initial onClick={requestClose} type="button"><X aria-hidden="true" size={18}/></button></header>
      <div aria-label="Información clínica de la cita" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6" role="region" tabIndex={0}>
        <div className="flex flex-wrap items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-clinic-50 text-clinic-600"><UserRound aria-hidden="true" size={22}/></span><div className="min-w-0 flex-1"><p className="break-words text-base font-bold text-ink-950">{entry.paciente?.nombres ?? 'Paciente no disponible'}</p><p className="admin-muted text-sm">Código: {entry.paciente?.codigo_paciente ?? 'No disponible'}</p></div>{entry.estado ? <span className={`admin-pill ${statusClasses[entry.estado]}`}>{statusLabels[entry.estado]}</span> : <span className="admin-muted text-sm">Estado no disponible</span>}</div>
        <dl className="mt-5 grid gap-2 sm:grid-cols-2"><div className="flex min-w-0 items-center gap-3 rounded-xl bg-[#f3f8fe] p-3"><CalendarDays aria-hidden="true" className="shrink-0 text-clinic-600" size={19}/><div><dt className="admin-muted text-xs">Fecha de la cita</dt><dd className="mt-0.5 text-sm font-semibold text-ink-950">{entry.fecha ? formatDate(entry.fecha) : 'No disponible'}</dd></div></div><div className="flex min-w-0 items-center gap-3 rounded-xl bg-[#f3f8fe] p-3"><Clock3 aria-hidden="true" className="shrink-0 text-clinic-600" size={19}/><div><dt className="admin-muted text-xs">Horario</dt><dd className="mt-0.5 text-sm font-semibold text-ink-950">{entry.hora_inicio && entry.hora_fin ? `${entry.hora_inicio.slice(0, 5)}–${entry.hora_fin.slice(0, 5)}` : 'No disponible'}</dd></div></div></dl>
        <div className="mt-6 flex items-center gap-2 border-b border-[#e3ecf6] pb-3 text-sm font-bold text-ink-950"><ClipboardList aria-hidden="true" className="text-clinic-600" size={18}/> Información de la cita</div>
        <dl>{([['Descripción', entry.descripcion, FileText], ['Diagnóstico', entry.diagnostico, Stethoscope], ['Tratamiento', entry.tratamiento, HeartPulse], ['Observación', entry.observacion, ClipboardList]] as const).map(([label, value, Icon]) => <div className="grid gap-1 border-b border-[#e3ecf6] py-3 text-sm sm:grid-cols-[125px_minmax(0,1fr)]" key={label}><dt className="flex items-center gap-2 font-semibold text-ink-950"><Icon aria-hidden="true" className="shrink-0 text-[#7890ae]" size={16}/>{label}</dt><dd className={`whitespace-pre-wrap break-words ${value?.trim() ? 'text-[#526a87]' : 'italic text-[#7890ae]'}`}>{value?.trim() || 'Sin datos registrados'}</dd></div>)}</dl>
      </div>
      <footer className="shrink-0 space-y-2 border-t border-[#e3ecf6] bg-white p-5 shadow-[0_-8px_20px_rgba(19,55,108,.05)] sm:px-6">
        {action ? <button className="admin-primary flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold" onClick={(event) => onAction(action, event.currentTarget)} type="button">{action === 'clinical' ? <Stethoscope aria-hidden="true" size={17}/> : null}{action === 'complete' ? 'Completar cita' : clinicalActionLabel(entry)}</button> : null}
        {action === 'complete' ? <button className="admin-secondary min-h-11 w-full rounded-xl px-4 text-sm font-semibold" onClick={(event) => onAction('clinical', event.currentTarget)} type="button">Editar datos clínicos</button> : null}
        {entry.estado === 'programada' ? <button className="admin-secondary min-h-11 w-full rounded-xl px-4 text-sm font-semibold" onClick={(event) => onAction('cancel', event.currentTarget)} type="button">Cancelar cita</button> : null}
      </footer>
    </aside>
  </>, document.body)
}

export function MedicalAppointmentsPage() {
  const now = new Date()
  const [month, setMonth] = useClinicalViewState('appointments.month', () => ({ year: now.getFullYear(), value: now.getMonth() + 1 }))
  const [statusFilter, setStatusFilter] = useClinicalViewState<StatusFilter>('appointments.status', () => 'todos')
  const [dayFilter, setDayFilter] = useClinicalViewState<string>('appointments.day', () => 'todos')
  const [patientSearch, setPatientSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'appointments' | 'pending'>('appointments')
  const [menuAbove, setMenuAbove] = useState(false)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const pendingMutation = useRef(false)
  const detailTrigger = useRef<HTMLElement | null>(null)
  const dialogTrigger = useRef<HTMLElement | null>(null)
  const focusAfterSave = useRef<DialogState | null>(null)
  const focusAfterCancel = useRef<DialogState | null>(null)
  const appointmentList = useRef<HTMLUListElement>(null)
  const pendingList = useRef<HTMLUListElement>(null)
  const pageHeading = useRef<HTMLHeadingElement>(null)
  const agendaQuery = useClinicalQuery(['agenda', month.value, month.year], (signal) => getAgendaMonth(month.value, month.year, signal))
  const pendingQuery = useClinicalQuery(['agenda', 'pending'], getPendingRequests)
  const state: PageState = agendaQuery.data ? { kind: 'ready', entries: agendaQuery.data, pending: pendingQuery.data ?? [] }
    : agendaQuery.isError ? { kind: 'error', message: errorMessage(agendaQuery.error) } : { kind: 'loading' }
  const load = async (): Promise<boolean> => {
    await markClinicalQueriesStale(['agenda'])
    const [agenda, pending] = await Promise.all([agendaQuery.refetch(), pendingQuery.refetch()])
    return agenda.isSuccess && pending.isSuccess
  }

  const openDialog = (next: DialogState, trigger: HTMLElement) => { dialogTrigger.current = trigger; setActionError(null); setDialog(next) }
  const closeDialog = () => { if (pendingMutation.current) return; focusAfterCancel.current = dialog; setDialog(null); setActionError(null) }
  const closeDetails = useCallback(() => { setSelectedEntryId(null); detailTrigger.current?.focus() }, [])
  const save = async (values?: AppointmentValues, completion?: CompleteAppointmentPayload) => {
    if (!dialog || pendingMutation.current) return
    pendingMutation.current = true; setBusy(true); setActionError(null)
    try {
      let message: string
      if (dialog.kind === 'program' && values) message = await programRequest(dialog.entry.id, { fecha: values.fecha, hora_inicio: values.hora_inicio, hora_fin: values.hora_fin })
      else if (dialog.kind === 'edit' && values) message = await updateAgendaEntry(dialog.entry.id, { fecha: values.fecha, hora_inicio: values.hora_inicio, hora_fin: values.hora_fin, descripcion: values.descripcion ?? null })
      else if (dialog.kind === 'cancel') message = await cancelAppointment(dialog.entry.id)
      else if (dialog.kind === 'complete' && completion) message = await completeAppointment(dialog.entry.id, completion)
      else if (dialog.kind === 'delete') message = await deleteAgendaEntry(dialog.entry.id)
      else return
      void markClinicalQueriesStale(['dashboard-report'])
      void markClinicalQueriesStale(['reports'])
      if (dialog.kind === 'complete') {
        void markClinicalQueriesStale(['activities'])
        void markClinicalQueriesStale(['activities-total'])
      }
      if (await load()) { focusAfterSave.current = dialog; setSuccess(message); setDialog(null) }
      else setActionError('El cambio se confirmó, pero no fue posible actualizar las citas. Reintenta la consulta.')
    } catch (error) { setActionError(errorMessage(error)) }
    finally { pendingMutation.current = false; setBusy(false) }
  }
  const saveClinical = async (values: ClinicalDataPayload) => {
    if (dialog?.kind !== 'clinical' || pendingMutation.current) return
    pendingMutation.current = true; setBusy(true); setActionError(null)
    try {
      const message = await registerClinicalData(dialog.entry.id, values)
      void markClinicalQueriesStale(['reports'])
      if (await load()) { focusAfterSave.current = dialog; setSuccess(message); setDialog(null) }
      else setActionError('El cambio se confirmó, pero no fue posible actualizar las citas. Reintenta la consulta.')
    } catch (error) { setActionError(errorMessage(error)) }
    finally { pendingMutation.current = false; setBusy(false) }
  }

  const monthlyAppointments = state.kind === 'ready'
    ? state.entries.filter((entry) => entry.tipo === 'cita_medica' && entry.fecha)
      .sort((a, b) => `${a.fecha} ${a.hora_inicio ?? ''}`.localeCompare(`${b.fecha} ${b.hora_inicio ?? ''}`))
    : []
  const appointmentDays = [...new Set(monthlyAppointments.map((entry) => entry.fecha!.slice(0, 10)))]
  const searchTerm = patientSearch.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-EC')
  const matchesPatient = (entry: AgendaEntry) => !searchTerm || `${entry.paciente?.nombres ?? ''} ${entry.paciente?.codigo_paciente ?? ''}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-EC').includes(searchTerm)
  const appointments = monthlyAppointments.filter((entry) =>
    (statusFilter === 'todos' || entry.estado === statusFilter)
    && (dayFilter === 'todos' || entry.fecha?.slice(0, 10) === dayFilter)
    && matchesPatient(entry),
  )
  const selectedEntry = appointments.find((entry) => entry.id === selectedEntryId)
  const pendingRequests = state.kind === 'ready' ? state.pending.filter(matchesPatient) : []
  useEffect(() => {
    if (!agendaQuery.data || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    appointmentList.current?.animate?.([{ opacity: .68 }, { opacity: 1 }], { duration: 225, easing: 'ease-out' })
  }, [agendaQuery.data])
  useEffect(() => {
    if (!pendingQuery.data || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    pendingList.current?.animate?.([{ opacity: .68 }, { opacity: 1 }], { duration: 225, easing: 'ease-out' })
  }, [pendingQuery.data])
  useEffect(() => {
    const saved = focusAfterSave.current
    if (dialog || !saved) return
    focusAfterSave.current = null
    if (saved.kind === 'delete') { pageHeading.current?.focus(); return }
    if (selectedEntry?.id === saved.entry.id) {
      document.querySelector<HTMLElement>('[data-detail-initial]')?.focus()
      return
    }
    const card = [...document.querySelectorAll<HTMLElement>('[data-appointment-id]')]
      .find((item) => item.dataset.appointmentId === saved.entry.id)
    const details = card?.querySelector<HTMLElement>('[data-detail-trigger]')
    if (details) details.focus()
    else pageHeading.current?.focus()
  }, [dialog, selectedEntry])
  useEffect(() => {
    const cancelled = focusAfterCancel.current
    if (dialog || !cancelled) return
    focusAfterCancel.current = null
    if (dialogTrigger.current?.isConnected) { dialogTrigger.current.focus(); return }
    const card = [...document.querySelectorAll<HTMLElement>('[data-appointment-id]')]
      .find((item) => item.dataset.appointmentId === cancelled.entry.id)
    const menu = card?.querySelector<HTMLElement>('[data-menu-trigger]')
    if (menu) menu.focus()
    else pageHeading.current?.focus()
  }, [dialog])
  const clearFilters = () => { const today = new Date(); setMonth({ year: today.getFullYear(), value: today.getMonth() + 1 }); setDayFilter('todos'); setStatusFilter('todos'); setPatientSearch('') }
  const moveTab = (event: KeyboardEvent<HTMLDivElement>) => {
    const tabs = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    const current = Array.from(tabs).indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === 'ArrowRight' ? (current + 1) % tabs.length : event.key === 'ArrowLeft' ? (current - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1
    if (next < 0) return
    event.preventDefault()
    tabs[next].focus()
    tabs[next].click()
  }
  const monthLabel = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' }).format(new Date(month.year, month.value - 1, 1))
  return <div className="max-w-[1390px] space-y-6">
    <header><p className="admin-kicker">Organización clínica</p><h1 className="admin-page-title mt-2 focus-visible:outline-2 focus-visible:outline-offset-2" ref={pageHeading} tabIndex={-1}>Citas médicas</h1><p className="admin-body mt-2">Consulta y gestión de las citas registradas en el período seleccionado.</p></header>
    {success ? <p className="admin-success rounded-xl p-4 text-sm" role="status">{success}</p> : null}
    {state.kind === 'ready' && (agendaQuery.isFetching || pendingQuery.isFetching) ? <p className="admin-muted text-sm" role="status">Actualizando citas…</p> : null}
    {state.kind === 'ready' && agendaQuery.isError ? <p className="text-sm text-red-700" role="alert">{errorMessage(agendaQuery.error)} <button className="dashboard-retry" onClick={() => { void load() }} type="button">Reintentar</button></p> : null}
    <section aria-label="Filtros de citas médicas" className="admin-surface rounded-[20px] p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(210px,1.35fr)_auto] xl:items-end">
        <label className="min-w-0 text-sm font-medium text-ink-950">Mes<input className={inputClass} disabled={activeTab === 'pending'} onChange={(event) => { if (!event.target.value) return; const [year, value] = event.target.value.split('-').map(Number); setMonth({ year, value }); setDayFilter('todos') }} type="month" value={`${month.year}-${String(month.value).padStart(2, '0')}`}/></label>
        <label className="min-w-0 text-sm font-medium text-ink-950">Día<select className={inputClass} disabled={activeTab === 'pending'} onChange={(event) => setDayFilter(event.target.value)} value={dayFilter}><option value="todos">Todos los días</option>{appointmentDays.map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}</select></label>
        <label className="min-w-0 text-sm font-medium text-ink-950">Estado<select className={inputClass} disabled={activeTab === 'pending'} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} value={statusFilter}><option value="todos">Todos los estados</option>{(Object.keys(statusLabels) as Array<keyof typeof statusLabels>).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
        <label className="min-w-0 text-sm font-medium text-ink-950">Buscar paciente<span className="relative mt-1 block"><Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7890ae]" size={18}/><input className="admin-input w-full min-w-0 text-sm" onChange={(event) => setPatientSearch(event.target.value)} placeholder="Nombre o código" style={{ paddingLeft: 42 }} type="search" value={patientSearch}/></span></label>
        <button className="admin-secondary min-h-12 rounded-xl px-4 text-sm font-semibold sm:col-span-2 xl:col-span-1" onClick={clearFilters} type="button">Limpiar filtros</button>
      </div>
    </section>
    {state.kind === 'loading' ? <LoadingState/> : state.kind === 'error' ? <ErrorState description={state.message} onRetry={() => { void load() }}/> : <section aria-label="Gestión de citas médicas" className="admin-surface min-w-0 rounded-[20px] p-4 sm:p-5">
      <div aria-label="Vistas de citas médicas" className="flex flex-wrap gap-2 border-b border-[#e3ecf6] pb-3" onKeyDown={moveTab} role="tablist">
        <button aria-controls="appointments-panel" aria-selected={activeTab === 'appointments'} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600 ${activeTab === 'appointments' ? 'bg-clinic-600 text-white' : 'text-[#526a87] hover:bg-clinic-50 hover:text-clinic-700'}`} id="appointments-tab" onClick={() => { setActiveTab('appointments'); setOpenMenuId(null) }} role="tab" tabIndex={activeTab === 'appointments' ? 0 : -1} type="button">Citas registradas <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === 'appointments' ? 'bg-white/20 text-white' : 'bg-clinic-50 text-clinic-700'}`}>{monthlyAppointments.length}</span></button>
        <button aria-controls="pending-panel" aria-selected={activeTab === 'pending'} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600 ${activeTab === 'pending' ? 'bg-clinic-600 text-white' : 'text-[#526a87] hover:bg-clinic-50 hover:text-clinic-700'}`} id="pending-tab" onClick={() => { setActiveTab('pending'); setOpenMenuId(null); setSelectedEntryId(null) }} role="tab" tabIndex={activeTab === 'pending' ? 0 : -1} type="button">Solicitudes pendientes <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-clinic-50 text-clinic-700'}`}>{state.pending.length}</span></button>
      </div>
      {activeTab === 'appointments' ? <div aria-labelledby="appointments-tab" className="medical-appointment-tab-panel" id="appointments-panel" role="tabpanel"><section aria-label="Citas registradas" className="flex min-h-0 min-w-0 flex-col pt-4 md:max-h-[65vh] md:min-h-[320px] xl:max-h-[calc(100dvh-520px)] xl:min-h-[240px]" role="region"><div className="flex shrink-0 flex-wrap items-end justify-between gap-2 pb-3"><div><p className="admin-kicker capitalize">{monthLabel}</p><h2 className="mt-1 text-lg font-semibold text-ink-950" id="appointments-title">{dayFilter === 'todos' ? 'Citas registradas' : `Citas del ${formatDate(dayFilter)}`}</h2></div><p className="admin-muted text-sm">Citas encontradas: {appointments.length}</p></div>
        {appointments.length === 0 ? <EmptyState description={dayFilter === 'todos' ? 'No hay citas médicas que coincidan con los filtros seleccionados.' : `No hay citas médicas para el ${formatDate(dayFilter)} con los filtros seleccionados.`} icon={CalendarDays} title="Sin citas en esta vista"/> : <ul aria-label="Listado de citas" className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pb-2 pr-1 sm:pr-2" data-appointment-list ref={appointmentList} tabIndex={0}>{appointments.map((entry) => <li className="medical-appointment-card min-w-0 rounded-xl border border-[#dbe6f2] bg-white p-3.5 shadow-[0_3px_12px_rgba(19,55,108,0.035)]" data-appointment-id={entry.id} data-selected={selectedEntryId === entry.id} key={entry.id}>
          <div className="flex min-w-0 flex-wrap items-start gap-3 sm:flex-nowrap"><div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1"><p className="min-w-0 break-words text-base font-bold text-ink-950">{entry.paciente?.nombres ?? 'Paciente no disponible'}</p>{entry.paciente?.codigo_paciente ? <span className="rounded-md bg-[#f0f5fb] px-2 py-0.5 text-xs font-semibold text-[#526a87]">Código: {entry.paciente.codigo_paciente}</span> : null}</div><p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#526a87]"><CalendarDays aria-hidden="true" className="text-clinic-600" size={16}/>{entry.fecha ? formatDate(entry.fecha) : 'Fecha pendiente'}{entry.hora_inicio && entry.hora_fin ? <span className="font-semibold text-ink-950">· {entry.hora_inicio.slice(0, 5)}–{entry.hora_fin.slice(0, 5)}</span> : null}</p></div><div className="flex shrink-0 items-start gap-2">{entry.estado ? <span className={`admin-pill ${statusClasses[entry.estado]}`}>{statusLabels[entry.estado]}</span> : null}<div className="relative"><button aria-expanded={openMenuId === entry.id} aria-label={`Opciones de cita para ${entry.paciente?.nombres ?? 'paciente'}`} className="admin-secondary grid size-10 place-items-center rounded-lg" data-menu-trigger onClick={(event) => { const button = event.currentTarget; const bottom = button.closest('[data-appointment-list]')?.getBoundingClientRect().bottom ?? window.innerHeight; setMenuAbove(bottom - button.getBoundingClientRect().bottom < 115); setOpenMenuId((current) => current === entry.id ? null : entry.id) }} type="button"><MoreVertical aria-hidden="true" size={18}/></button>{openMenuId === entry.id ? <div className={`absolute right-0 z-20 min-w-40 rounded-xl border border-[#dbe6f2] bg-white p-1 shadow-lg ${menuAbove ? 'bottom-full mb-1' : 'top-full mt-1'}`}>{entry.estado !== 'pendiente' ? <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-950 hover:bg-sky-50" onClick={(event) => { setOpenMenuId(null); openDialog({ kind: 'edit', entry }, event.currentTarget) }} type="button">Editar cita</button> : null}<button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50" onClick={(event) => { setOpenMenuId(null); openDialog({ kind: 'delete', entry }, event.currentTarget) }} type="button">Eliminar</button></div> : null}</div></div></div>
          <button aria-expanded={selectedEntryId === entry.id} className="mt-2.5 flex items-center gap-1.5 border-t border-[#e8eef6] pt-2 text-xs font-semibold text-clinic-700 hover:text-clinic-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" data-detail-trigger onClick={(event) => { detailTrigger.current = event.currentTarget; setSelectedEntryId(entry.id); setOpenMenuId(null) }} type="button"><HeartPulse aria-hidden="true" size={14}/>Ver detalles</button>
        </li>)}</ul>}
      </section>{selectedEntry ? <AppointmentDetails entry={selectedEntry} onAction={(kind, trigger) => openDialog({ kind, entry: selectedEntry }, trigger)} onClose={closeDetails}/> : null}</div> : <div aria-labelledby="pending-tab" className="medical-appointment-tab-panel" id="pending-panel" role="tabpanel"><section aria-labelledby="pending-requests-title" className="flex min-h-0 min-w-0 flex-col pt-4 md:max-h-[65vh] md:min-h-[320px] xl:max-h-[calc(100dvh-520px)] xl:min-h-[240px]"><div className="flex shrink-0 flex-wrap items-end justify-between gap-2 pb-3"><div><p className="admin-kicker">Gestión de solicitudes</p><h2 className="mt-1 text-lg font-semibold text-ink-950" id="pending-requests-title">Solicitudes pendientes</h2></div><p className="admin-muted text-sm">Solicitudes encontradas: {pendingRequests.length}</p></div>
        {pendingQuery.isError ? <ErrorState description={errorMessage(pendingQuery.error)} onRetry={() => { void pendingQuery.refetch() }}/> : pendingQuery.isPending ? <LoadingState/> : pendingRequests.length === 0 ? <EmptyState description={searchTerm ? 'No hay solicitudes para este paciente.' : 'No hay solicitudes de citas pendientes.'} icon={CalendarDays} title="Sin solicitudes pendientes"/> : <ul aria-label="Lista de solicitudes pendientes" className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pr-1 sm:pr-2" ref={pendingList} tabIndex={0}>{pendingRequests.map((entry) => <li className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dbe6f2] bg-white p-3.5 sm:p-4" key={entry.id}><div className="min-w-0"><p className="break-words font-bold text-ink-950">{entry.paciente?.nombres ?? 'Paciente no disponible'}</p>{entry.paciente?.codigo_paciente ? <p className="admin-muted mt-1 text-sm">Código: {entry.paciente.codigo_paciente}</p> : null}</div><button className="admin-primary min-h-11 rounded-lg px-4 text-sm font-semibold" onClick={(event) => openDialog({ kind: 'program', entry }, event.currentTarget)} type="button">Programar</button></li>)}</ul>}
      </section></div>}
    </section>}
    {dialog ? <AccessibleDialog busy={busy} onClose={closeDialog} title={dialog.kind === 'clinical' ? dialog.entry.estado === 'completada' ? 'Editar datos clínicos' : clinicalActionLabel(dialog.entry) : dialogTitles[dialog.kind]} titleId="appointment-dialog-title">{dialog.kind === 'clinical' ? <ClinicalDataForm busy={busy} entry={dialog.entry} error={actionError} key={dialog.entry.id} onCancel={closeDialog} onSave={saveClinical}/> : dialog.kind === 'complete' ? <CompleteAppointmentForm busy={busy} error={actionError} key={dialog.entry.id} onCancel={closeDialog} onSave={(values) => save(undefined, values)}/> : <AppointmentDialogForm busy={busy} dialog={dialog} error={actionError} key={`${dialog.kind}-${dialog.entry.id}`} onCancel={closeDialog} onSave={save}/>}</AccessibleDialog> : null}
  </div>
}
