import { isAxiosError } from 'axios'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { formatDate } from '../../utils/displayFormat'
import { getAgendaMonth, type AgendaEntry } from './agendaService'

type AgendaState = { kind: 'loading' } | { kind: 'ready'; entries: AgendaEntry[] } | { kind: 'error'; message: string }
const two = (value: number) => String(value).padStart(2, '0')
const dateKey = (year: number, month: number, day: number) => `${year}-${two(month)}-${two(day)}`

function errorMessage(error: unknown): string {
  if (isAxiosError(error) && !error.response) return 'No fue posible comunicarse con el servidor.'
  return 'No fue posible cargar la agenda. Inténtalo de nuevo.'
}

export function AgendaPage() {
  const now = new Date()
  const [month, setMonth] = useState({ year: now.getFullYear(), value: now.getMonth() + 1 })
  const [selectedDate, setSelectedDate] = useState(dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate()))
  const [daySelected, setDaySelected] = useState(false)
  const [state, setState] = useState<AgendaState>({ kind: 'loading' })
  const requestId = useRef(0)
  const load = useCallback(async () => {
    const id = ++requestId.current
    setState({ kind: 'loading' })
    try {
      const entries = await getAgendaMonth(month.value, month.year)
      if (id === requestId.current) setState({ kind: 'ready', entries })
    } catch (error) {
      if (id === requestId.current) setState({ kind: 'error', message: errorMessage(error) })
    }
  }, [month.value, month.year])
  useEffect(() => { const request = requestId; void Promise.resolve().then(load); return () => { request.current++ } }, [load])

  const selectMonth = (year: number, value: number) => {
    setMonth({ year, value })
    setSelectedDate(dateKey(year, value, 1))
    setDaySelected(false)
  }
  const shiftMonth = (change: number) => {
    const next = new Date(month.year, month.value - 1 + change, 1)
    selectMonth(next.getFullYear(), next.getMonth() + 1)
  }
  const dayCount = new Date(month.year, month.value, 0).getDate()
  const offset = (new Date(month.year, month.value - 1, 1).getDay() + 6) % 7
  const days = Array.from({ length: dayCount }, (_, index) => index + 1)
  const monthLabel = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' }).format(new Date(month.year, month.value - 1, 1))
  const selectedEntries = state.kind === 'ready' ? state.entries.filter((entry) => entry.fecha?.slice(0, 10) === selectedDate) : []

  return <div className="admin-reveal max-w-[1390px] space-y-6">
    <header><p className="admin-kicker">Organización clínica</p><h1 className="admin-page-title mt-2">Agenda</h1><p className="admin-body mt-2">Consulta los registros existentes del calendario.</p></header>
    {state.kind === 'error' ? <ErrorState description={state.message} onRetry={() => { void load() }}/> : null}
    <div className="flex justify-end"><div className="flex items-center gap-2"><button aria-label="Mes anterior" className="admin-secondary grid size-11 place-items-center rounded-lg" onClick={() => shiftMonth(-1)} type="button"><ChevronLeft aria-hidden="true" size={18}/></button><label className="text-xs font-semibold text-ink-950">Mes<input aria-label="Mes" className="admin-input ml-2 text-sm" onChange={(event) => { if (!event.target.value) return; const [year, value] = event.target.value.split('-').map(Number); selectMonth(year, value) }} type="month" value={`${month.year}-${two(month.value)}`}/></label><button aria-label="Mes siguiente" className="admin-secondary grid size-11 place-items-center rounded-lg" onClick={() => shiftMonth(1)} type="button"><ChevronRight aria-hidden="true" size={18}/></button></div></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(290px,.8fr)]">
      <section aria-label={`Calendario de ${monthLabel}`} className="admin-surface min-w-0 rounded-[20px] p-4 sm:p-6">
        <h2 className="mb-5 flex items-center gap-2 text-xl font-bold capitalize text-ink-950"><CalendarDays aria-hidden="true" size={21}/>{monthLabel}</h2>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#526a87] sm:gap-2">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, index) => <span key={index}>{label}</span>)}
          {Array.from({ length: offset }, (_, index) => <span aria-hidden="true" key={`empty-${index}`}/>)}
          {days.map((day) => {
            const key = dateKey(month.year, month.value, day)
            const records = state.kind === 'ready' ? state.entries.filter((entry) => entry.fecha?.slice(0, 10) === key) : []
            const active = daySelected && selectedDate === key
            return <button aria-label={`Seleccionar ${day} de ${monthLabel}`} aria-pressed={active} className={`min-h-16 rounded-lg border p-1 text-left align-top transition-colors sm:min-h-24 sm:p-2 ${active ? 'border-clinic-600 bg-clinic-50' : 'border-[#dbe6f2] hover:bg-[#f3f8fe]'}`} key={key} onClick={() => { setSelectedDate(key); setDaySelected(true) }} type="button"><span className="block text-sm font-bold text-ink-950">{day}</span>{records.length ? <span className="mt-1 block truncate text-[10px] font-medium text-clinic-700 sm:text-xs">{records[0].descripcion || (records[0].tipo === 'cita_medica' ? 'Cita médica' : 'Actividad personal')}{records.length > 1 ? ` · +${records.length - 1}` : ''}</span> : null}</button>
          })}
        </div>
      </section>
      <section aria-labelledby="selected-day-title" className="admin-surface rounded-[20px] p-5 sm:p-6">
        <p className="admin-kicker">Día seleccionado</p><h2 className="mt-2 text-xl font-bold text-ink-950" id="selected-day-title">{daySelected ? formatDate(selectedDate) : 'Selecciona un día'}</h2>
        {!daySelected ? <p className="admin-muted mt-3 text-sm">Selecciona un día del calendario para consultar sus registros.</p> : state.kind === 'loading' ? <LoadingState/> : state.kind === 'error' ? null : <>
          <p className="admin-muted mt-3 text-sm">{selectedEntries.length} {selectedEntries.length === 1 ? 'registro' : 'registros'}</p>
          {selectedEntries.length === 0 ? <p className="admin-muted mt-5 text-sm">Sin registros para este día.</p> : <ul className="mt-5 space-y-3">{selectedEntries.map((entry) => <li className="rounded-xl border border-[#dbe6f2] p-4" key={entry.id}>
            <span className="admin-pill admin-pill-ready">{entry.tipo === 'personal' ? 'Actividad personal' : 'Cita médica'}</span>
            <p className="mt-2 font-semibold text-ink-950">{entry.descripcion || (entry.tipo === 'cita_medica' ? entry.paciente?.nombres ?? 'Cita médica' : 'Actividad personal')}</p>
            <p className="admin-muted mt-1 text-sm">{entry.hora_inicio?.slice(0, 5)}–{entry.hora_fin?.slice(0, 5)}{entry.paciente ? ` · ${entry.paciente.nombres}` : ''}</p>
            {entry.estado ? <p className="admin-muted mt-1 text-xs">Estado: {entry.estado}</p> : null}
          </li>)}</ul>}
        </>}
      </section>
    </div>
  </div>
}
