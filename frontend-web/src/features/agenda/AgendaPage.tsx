import { isAxiosError } from 'axios'
import { CalendarDays, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { formatDate } from '../../utils/displayFormat'
import { useAuth } from '../auth/authContext'
import { createMedicalAppointment, createPersonalEntry, deleteAgendaEntry, getAgendaMonth, updateAgendaEntry, type AgendaEntry, type MedicalAppointmentPayload, type PersonalEntryPayload } from './agendaService'
import { markClinicalQueriesStale, useClinicalQuery } from '../../services/clinicalQuery'
import { useClinicalViewState } from '../../services/clinicalViewState'
import type { Patient } from '../patients/patientService'
import { AgendaPatientSearch } from './AgendaPatientSearch'

type AgendaState = { kind: 'loading' } | { kind: 'ready'; entries: AgendaEntry[] } | { kind: 'error'; message: string }
const two = (value: number) => String(value).padStart(2, '0')
const dateKey = (year: number, month: number, day: number) => `${year}-${two(month)}-${two(day)}`

function errorMessage(error: unknown): string {
  if (isAxiosError(error) && !error.response) return 'No fue posible confirmar si el registro se guardó. Consulta la agenda antes de intentarlo de nuevo.'
  if (isAxiosError(error) && [409, 422].includes(error.response?.status ?? 0)) {
    const message = (error.response?.data as { message?: unknown } | undefined)?.message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'No fue posible completar la operación. Inténtalo de nuevo.'
}

type EntryChoice = { kind: 'medical'; values: MedicalAppointmentPayload } | { kind: 'personal'; values: PersonalEntryPayload }

function AgendaEntryDialog({ entry, kind, busy, error, onCancel, onSave }: { entry: AgendaEntry; kind: 'edit' | 'delete'; busy: boolean; error: string | null; onCancel: () => void; onSave: (values?: { fecha: string; hora_inicio: string; hora_fin: string; descripcion: string | null }) => void }) {
  const [fecha, setFecha] = useState(entry.fecha?.slice(0, 10) ?? '')
  const [inicio, setInicio] = useState(entry.hora_inicio?.slice(0, 5) ?? '')
  const [fin, setFin] = useState(entry.hora_fin?.slice(0, 5) ?? '')
  const [descripcion, setDescripcion] = useState(entry.descripcion ?? '')
  const [validation, setValidation] = useState<string | null>(null)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (kind === 'delete') { onSave(); return }
    if (!fecha || !inicio || !fin || fin <= inicio) { setValidation('Revisa la fecha y el horario. La hora final debe ser posterior a la inicial.'); return }
    onSave({ fecha, hora_inicio: inicio, hora_fin: fin, descripcion: descripcion.trim() || null })
  }
  return <form aria-label={kind === 'edit' ? 'Editar registro de agenda' : 'Eliminar registro de agenda'} noValidate onSubmit={submit}>
    {kind === 'delete' ? <p className="admin-body text-sm">¿Eliminar este registro de agenda? Esta acción no se puede deshacer.</p> : <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-ink-950">Fecha<input className="admin-input mt-1 w-full text-sm" data-dialog-initial onChange={(event) => setFecha(event.target.value)} required type="date" value={fecha}/></label>
      <label className="text-sm font-medium text-ink-950">Hora de inicio<input className="admin-input mt-1 w-full text-sm" onChange={(event) => setInicio(event.target.value)} required type="time" value={inicio}/></label>
      <label className="text-sm font-medium text-ink-950">Hora de fin<input className="admin-input mt-1 w-full text-sm" onChange={(event) => setFin(event.target.value)} required type="time" value={fin}/></label>
      <label className="text-sm font-medium text-ink-950 sm:col-span-2">Descripción<textarea className="admin-input mt-1 w-full text-sm" onChange={(event) => setDescripcion(event.target.value)} rows={3} value={descripcion}/></label>
    </div>}
    {validation || error ? <p className="mt-4 text-sm text-red-700" role="alert">{validation ?? error}</p> : null}
    <div className="mt-6 flex flex-wrap gap-3"><button className={`${kind === 'delete' ? 'min-h-11 rounded-lg border border-red-200 px-5 text-sm font-semibold text-red-700' : 'admin-primary rounded-lg px-5 text-sm font-semibold'} min-h-11 disabled:opacity-60`} disabled={busy} type="submit">{busy ? 'Procesando…' : kind === 'delete' ? 'Eliminar' : 'Guardar cambios'}</button><button className="admin-secondary min-h-11 rounded-lg px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={onCancel} type="button">Cancelar</button></div>
  </form>
}

function AgendaForm({ date, busy, error, onCancel, onSave, onKindChange }: { date: string; busy: boolean; error: string | null; onCancel: () => void; onSave: (choice: EntryChoice) => void; onKindChange: (kind: 'medical' | 'personal') => void }) {
  const [kind, setKind] = useState<'medical' | 'personal'>('medical')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [description, setDescription] = useState('')
  const [validation, setValidation] = useState<string | null>(null)
  const selectKind = (next: 'medical' | 'personal') => {
    if (next === kind) return
    setPatient(null)
    setKind(next)
    setValidation(null)
    onKindChange(next)
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (!start || !end || end <= start) { setValidation('Ingresa un horario válido. La hora final debe ser posterior a la inicial.'); return }
    if (kind === 'medical' && !patient) { setValidation('Selecciona un paciente de los resultados de búsqueda.'); return }
    if (kind === 'personal' && !description.trim()) { setValidation('La descripción es obligatoria para una actividad personal.'); return }
    setValidation(null)
    if (kind === 'personal') onSave({ kind, values: { fecha: date, hora_inicio: start, hora_fin: end, descripcion: description.trim() } })
    else onSave({ kind, values: { codigo_paciente: patient!.codigo_paciente, fecha: date, hora_inicio: start, hora_fin: end, descripcion: description.trim() || null } })
  }
  return <form aria-label={kind === 'medical' ? 'Agendar cita médica' : 'Agendar actividad personal'} noValidate onSubmit={submit}>
    <div aria-label="Tipo de registro" className="mb-5 flex flex-wrap gap-2" role="group"><button aria-pressed={kind === 'medical'} className={`admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold ${kind === 'medical' ? 'border-clinic-600 bg-clinic-50 text-clinic-700' : ''}`} disabled={busy} onClick={() => selectKind('medical')} type="button">Cita médica</button><button aria-pressed={kind === 'personal'} className={`admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold ${kind === 'personal' ? 'border-clinic-600 bg-clinic-50 text-clinic-700' : ''}`} disabled={busy} onClick={() => selectKind('personal')} type="button">Actividad personal</button></div>
    <p className="admin-body mb-5 text-sm">Fecha seleccionada: <strong>{formatDate(date)}</strong></p>
    <div className="grid gap-4 sm:grid-cols-2">{kind === 'medical' ? <AgendaPatientSearch disabled={busy} onSelect={(next) => { setPatient(next); setValidation(null) }} selected={patient}/> : null}<label className="text-sm font-medium text-ink-950">Hora de inicio<input className="admin-input mt-1 w-full text-sm" onChange={(event) => setStart(event.target.value)} required type="time" value={start}/></label><label className="text-sm font-medium text-ink-950">Hora de fin<input className="admin-input mt-1 w-full text-sm" onChange={(event) => setEnd(event.target.value)} required type="time" value={end}/></label><label className="text-sm font-medium text-ink-950 sm:col-span-2">{kind === 'medical' ? 'Descripción (opcional)' : 'Descripción'}<textarea className="admin-input mt-1 w-full text-sm" onChange={(event) => setDescription(event.target.value)} required={kind === 'personal'} rows={2} value={description}/></label></div>
    {validation || error ? <p className="mt-4 text-sm text-red-700" role="alert">{validation ?? error}</p> : null}
    <div className="mt-6 flex flex-wrap gap-3"><button className="admin-primary min-h-11 rounded-lg px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Guardando…' : kind === 'medical' ? 'Guardar cita' : 'Guardar actividad'}</button><button className="admin-secondary min-h-11 rounded-lg px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={onCancel} type="button">Cancelar</button></div>
  </form>
}

export function AgendaPage() {
  const { user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useClinicalViewState('agenda.month', () => ({ year: now.getFullYear(), value: now.getMonth() + 1 }))
  const [selectedDate, setSelectedDate] = useClinicalViewState('agenda.date', () => dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate()))
  const [daySelected, setDaySelected] = useClinicalViewState('agenda.daySelected', () => false)
  const [appointmentOpen, setAppointmentOpen] = useState(false)
  const [appointmentKind, setAppointmentKind] = useState<'medical' | 'personal'>('medical')
  const [appointmentBusy, setAppointmentBusy] = useState(false)
  const [appointmentError, setAppointmentError] = useState<string | null>(null)
  const [appointmentSuccess, setAppointmentSuccess] = useState<string | null>(null)
  const [entryDialog, setEntryDialog] = useState<{ kind: 'edit' | 'delete'; entry: AgendaEntry } | null>(null)
  const [entryBusy, setEntryBusy] = useState(false)
  const [entryError, setEntryError] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const calendarCard = useRef<HTMLElement | null>(null)
  const [calendarHeight, setCalendarHeight] = useState<number | null>(null)
  const appointmentPending = useRef(false)
  const appointmentTrigger = useRef<HTMLButtonElement | null>(null)
  const query = useClinicalQuery(['agenda', month.value, month.year], (signal) => getAgendaMonth(month.value, month.year, signal))
  useEffect(() => {
    const element = calendarCard.current
    if (!element) return
    const updateHeight = () => setCalendarHeight(element.getBoundingClientRect().height)
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const state: AgendaState = query.data ? { kind: 'ready', entries: query.data }
    : query.isError ? { kind: 'error', message: 'No fue posible cargar la agenda. Inténtalo de nuevo.' } : { kind: 'loading' }
  const load = async (): Promise<boolean> => {
    await markClinicalQueriesStale(['agenda'])
    return (await query.refetch()).isSuccess
  }

  const selectMonth = (year: number, value: number) => {
    setMonth({ year, value })
    setSelectedDate(dateKey(year, value, 1))
    setDaySelected(false)
    setAppointmentSuccess(null)
  }
  const shiftMonth = (change: number) => {
    const next = new Date(month.year, month.value - 1 + change, 1)
    selectMonth(next.getFullYear(), next.getMonth() + 1)
  }
  const dayCount = new Date(month.year, month.value, 0).getDate()
  const offset = (new Date(month.year, month.value - 1, 1).getDay() + 6) % 7
  const days = Array.from({ length: dayCount }, (_, index) => index + 1)
  const monthLabel = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' }).format(new Date(month.year, month.value - 1, 1))
  const monthEntries = state.kind === 'ready'
    ? state.entries.filter((entry) => entry.fecha?.slice(0, 7) === `${month.year}-${two(month.value)}`)
      .sort((a, b) => `${a.fecha} ${a.hora_inicio ?? ''}`.localeCompare(`${b.fecha} ${b.hora_inicio ?? ''}`))
    : []
  const closeAppointment = () => { if (appointmentPending.current) return; setAppointmentOpen(false); setAppointmentError(null); appointmentTrigger.current?.focus() }
  const saveAppointment = async (choice: EntryChoice) => {
    if (appointmentPending.current) return
    appointmentPending.current = true; setAppointmentBusy(true); setAppointmentError(null)
    try {
      if (choice.kind === 'medical') {
        await createMedicalAppointment(choice.values)
        void markClinicalQueriesStale(['dashboard-report'])
        void markClinicalQueriesStale(['reports'])
      } else await createPersonalEntry(choice.values)
      const refreshed = await load()
      setAppointmentOpen(false)
      const label = choice.kind === 'medical' ? 'La cita' : 'La actividad personal'
      setAppointmentSuccess(refreshed ? choice.kind === 'medical' ? 'Cita médica registrada correctamente.' : 'Actividad personal registrada correctamente.' : `${label} se registró, pero no fue posible actualizar el calendario. Reintenta la consulta antes de agendar otra.`)
      appointmentTrigger.current?.focus()
    } catch (error) { setAppointmentError(errorMessage(error)) }
    finally { appointmentPending.current = false; setAppointmentBusy(false) }
  }
  const saveEntryAction = async (values?: { fecha: string; hora_inicio: string; hora_fin: string; descripcion: string | null }) => {
    if (!entryDialog || entryBusy) return
    setEntryBusy(true); setEntryError(null)
    try {
      const message = entryDialog.kind === 'edit'
        ? await updateAgendaEntry(entryDialog.entry.id, values!)
        : await deleteAgendaEntry(entryDialog.entry.id)
      const refreshed = await load()
      setAppointmentSuccess(refreshed ? message : `${message} No fue posible actualizar el calendario; vuelve a cargarlo.`)
      setEntryDialog(null)
    } catch (error) { setEntryError(errorMessage(error)) }
    finally { setEntryBusy(false) }
  }

  return <div className="admin-reveal max-w-[1390px] space-y-6">
    <header><p className="admin-kicker">Organización clínica</p><h1 className="admin-page-title mt-2">Agenda</h1><p className="admin-body mt-2">Consulta las citas y actividades del mes{user?.role === 'doctora' ? ' y selecciona un día para agendar.' : '.'}</p></header>
    {state.kind === 'ready' && query.isFetching ? <p className="admin-muted text-sm" role="status">Actualizando agenda…</p> : null}
    {state.kind === 'ready' && query.isError ? <p className="text-sm text-red-700" role="alert">No fue posible actualizar la agenda. <button className="dashboard-retry" onClick={() => { void load() }} type="button">Reintentar</button></p> : null}
    {appointmentSuccess ? <p className="admin-success rounded-xl p-4 text-sm" role="status">{appointmentSuccess}</p> : null}
    {appointmentOpen ? <AccessibleDialog busy={appointmentBusy} onClose={closeAppointment} title={appointmentKind === 'medical' ? 'Agendar cita médica' : 'Agendar actividad personal'} titleId="agenda-appointment-title"><AgendaForm busy={appointmentBusy} date={selectedDate} error={appointmentError} onCancel={closeAppointment} onKindChange={(next) => { setAppointmentKind(next); setAppointmentError(null) }} onSave={(choice) => { void saveAppointment(choice) }}/></AccessibleDialog> : null}
    {entryDialog ? <AccessibleDialog busy={entryBusy} onClose={() => { if (!entryBusy) { setEntryDialog(null); setEntryError(null) } }} title={entryDialog.kind === 'edit' ? 'Editar registro de agenda' : 'Eliminar registro'} titleId="agenda-entry-dialog-title"><AgendaEntryDialog busy={entryBusy} entry={entryDialog.entry} error={entryError} kind={entryDialog.kind} onCancel={() => { setEntryDialog(null); setEntryError(null) }} onSave={(values) => { void saveEntryAction(values) }}/></AccessibleDialog> : null}
    <div className="flex justify-end"><div className="flex items-center gap-2"><button aria-label="Mes anterior" className="admin-secondary grid size-11 place-items-center rounded-lg" onClick={() => shiftMonth(-1)} type="button"><ChevronLeft aria-hidden="true" size={18}/></button><label className="text-xs font-semibold text-ink-950">Mes<input aria-label="Mes" className="admin-input ml-2 text-sm" onChange={(event) => { if (!event.target.value) return; const [year, value] = event.target.value.split('-').map(Number); selectMonth(year, value) }} type="month" value={`${month.year}-${two(month.value)}`}/></label><button aria-label="Mes siguiente" className="admin-secondary grid size-11 place-items-center rounded-lg" onClick={() => shiftMonth(1)} type="button"><ChevronRight aria-hidden="true" size={18}/></button></div></div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      <section aria-label={`Calendario de ${monthLabel}`} className="admin-surface w-full max-w-[420px] min-w-0 rounded-[20px] p-3 sm:p-4 xl:max-w-none" ref={calendarCard}>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold capitalize text-ink-950"><CalendarDays aria-hidden="true" size={18}/>{monthLabel}</h2>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#526a87]">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, index) => <span key={index}>{label}</span>)}
          {Array.from({ length: offset }, (_, index) => <span aria-hidden="true" key={`empty-${index}`}/>)}
          {days.map((day) => {
            const key = dateKey(month.year, month.value, day)
            const records = state.kind === 'ready' ? state.entries.filter((entry) => entry.fecha?.slice(0, 10) === key) : []
            const active = daySelected && selectedDate === key
            const today = key === dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate())
            return <button aria-label={`Seleccionar ${day} de ${monthLabel}${records.length ? `, ${records.length} ${records.length === 1 ? 'registro' : 'registros'}` : ''}`} aria-current={today ? 'date' : undefined} aria-pressed={active} className={`relative min-h-11 rounded-lg border p-1 text-center transition-colors sm:min-h-12 ${active ? 'border-clinic-600 bg-clinic-50 ring-1 ring-clinic-600' : today ? 'border-sky-400 bg-sky-50/70 hover:bg-sky-100' : 'border-[#dbe6f2] hover:bg-[#f3f8fe]'}`} key={key} onClick={(event) => { setSelectedDate(key); setDaySelected(true); setAppointmentSuccess(null); if (user?.role === 'doctora') { appointmentTrigger.current = event.currentTarget; setAppointmentError(null); setAppointmentKind('medical'); setAppointmentOpen(true) } }} type="button"><span className="block text-sm font-bold text-ink-950">{day}</span>{records.length ? <span aria-hidden="true" className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-clinic-600"/> : null}</button>
          })}
        </div>
      </section>
      <section aria-label="Registros agendados" className="admin-surface flex min-h-0 min-w-0 flex-col rounded-[20px] p-5 sm:p-6 xl:h-[var(--agenda-calendar-height)] xl:overflow-hidden" style={calendarHeight === null ? undefined : { '--agenda-calendar-height': `${calendarHeight}px` } as CSSProperties}>
        <p className="admin-kicker">Agenda del mes</p>
        <h2 className="mt-2 text-xl font-bold text-ink-950">Agendado en {monthLabel}</h2>
        {state.kind === 'loading' ? <LoadingState/> : state.kind === 'error' ? <div className="mt-5"><ErrorState description={state.message} onRetry={() => { void load() }}/></div> : <>
          <p className="admin-muted mt-2 text-sm">{monthEntries.length} {monthEntries.length === 1 ? 'registro agendado' : 'registros agendados'}</p>
          {monthEntries.length === 0 ? <p className="admin-muted mt-6 text-sm">No hay registros agendados para este mes.</p> : <ul className="mt-5 divide-y divide-[#dbe6f2] xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:pr-2">{monthEntries.map((entry) => <li className="flex flex-wrap gap-4 py-4 first:pt-0 last:pb-0" key={entry.id}>
            <div className="min-w-32 shrink-0"><p className="text-sm font-semibold text-ink-950">{formatDate(entry.fecha!)}</p><p className="admin-muted mt-1 text-sm">{entry.hora_inicio?.slice(0, 5) ?? 'Hora no disponible'}{entry.hora_fin ? `–${entry.hora_fin.slice(0, 5)}` : ''}</p></div>
            <div className="min-w-0 flex-1"><span className="admin-pill admin-pill-ready">{entry.tipo === 'personal' ? 'Actividad personal' : 'Cita médica'}</span><p className="mt-2 break-words font-semibold text-ink-950">{entry.descripcion || (entry.tipo === 'cita_medica' ? entry.paciente?.nombres ?? 'Cita médica' : 'Actividad personal')}</p>{entry.paciente ? <p className="admin-muted mt-1 break-words text-sm">{entry.paciente.nombres}</p> : null}{entry.estado ? <p className="admin-muted mt-1 text-xs">Estado: {entry.estado}</p> : null}</div>
            {user?.role === 'doctora' ? <div className="relative"><button aria-expanded={openMenuId === entry.id} aria-label={`Más opciones para ${entry.descripcion || entry.paciente?.nombres || 'registro'}`} className="admin-secondary grid size-10 place-items-center rounded-lg" onClick={() => setOpenMenuId((current) => current === entry.id ? null : entry.id)} type="button"><MoreVertical aria-hidden="true" size={18}/></button>{openMenuId === entry.id ? <div className="absolute right-0 top-full z-10 mt-1 min-w-36 rounded-xl border border-[#dbe6f2] bg-white p-1 shadow-lg"><button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-950 hover:bg-sky-50" onClick={() => { setOpenMenuId(null); setEntryError(null); setEntryDialog({ kind: 'edit', entry }) }} type="button">Editar</button><button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50" onClick={() => { setOpenMenuId(null); setEntryError(null); setEntryDialog({ kind: 'delete', entry }) }} type="button">Eliminar</button></div> : null}</div> : null}
          </li>)}</ul>}
        </>}
      </section>
    </div>
  </div>
}
