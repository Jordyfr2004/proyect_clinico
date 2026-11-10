import { isAxiosError } from 'axios'
import { CalendarDays, ClipboardList, MoreVertical, Plus, Wallet } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { IncrementalList } from '../../components/ui/IncrementalList'
import { formatCurrency, formatDate } from '../../utils/displayFormat'
import { useAuth } from '../auth/authContext'
import { createActivity, deleteActivity, getActivities, getActivityTotal, lookupPatientByCode, updateActivity, type Activity, type ActivityFilters, type ActivityPayload, type ActivityPeriod } from './activityService'
import { markClinicalQueriesStale, useClinicalQuery } from '../../services/clinicalQuery'
import { useClinicalViewState } from '../../services/clinicalViewState'

type PeriodKind = ActivityPeriod['periodo']
type Dialog = { kind: 'create' | 'edit' | 'delete'; record?: Activity }

function actionMenuPosition(anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect()
  const width = 160
  const height = 96
  const gap = 6
  return {
    left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
    top: Math.max(8, Math.min(rect.bottom + gap + height <= window.innerHeight - 8 ? rect.bottom + gap : rect.top - height - gap, window.innerHeight - height - 8)),
  }
}

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

function periodParams(kind: PeriodKind, date: string, month: string, year: string, code: string): { list: ActivityFilters; total: ActivityPeriod } {
  const anio = Number(year)
  const mes = Number(month)
  const total: ActivityPeriod = kind === 'dia' || kind === 'semana' ? { periodo: kind, fecha: date } : kind === 'mes' ? { periodo: 'mes', mes, anio } : { periodo: 'anio', anio }
  const list: ActivityFilters = kind === 'dia' ? { fecha: date } : kind === 'semana' ? { semana: date } : kind === 'mes' ? { mes, anio } : { anio }
  if (code.trim()) list.codigo_paciente = code.trim()
  return { list, total }
}

function ActivityForm({ record, busy, error, onSave, onCancel }: { record?: Activity; busy: boolean; error: string | null; onSave: (values: ActivityPayload) => Promise<void>; onCancel: () => void }) {
  const [code, setCode] = useState(record?.paciente.codigo_paciente ?? '')
  const [date, setDate] = useState(record?.fecha.slice(0, 10) ?? '')
  const [activity, setActivity] = useState(record?.actividad ?? '')
  const [price, setPrice] = useState(record ? String(record.precio) : '')
  const [patient, setPatient] = useState<string | null>(record?.paciente.nombres ?? null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [validation, setValidation] = useState<string | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const lookupVersion = useRef(0)
  const lookup = async () => {
    if (!code.trim()) { setLookupError('Ingresa un código de paciente.'); return }
    const version = ++lookupVersion.current
    setLookingUp(true); setLookupError(null); setPatient(null)
    try { const found = await lookupPatientByCode(code.trim()); if (version === lookupVersion.current) setPatient(found.nombres) }
    catch (cause) { if (version === lookupVersion.current) setLookupError(errorMessage(cause)) }
    finally { if (version === lookupVersion.current) setLookingUp(false) }
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!code.trim() || !date || !activity.trim() || price === '' || !Number.isFinite(Number(price)) || Number(price) < 0) { setValidation('Completa el código, la fecha, la actividad y un precio válido.'); return }
    if (lookupError) return
    void onSave({ codigo_paciente: code.trim(), fecha: date, actividad: activity.trim(), precio: Number(price) })
  }
  return <form aria-label="Datos de actividad" noValidate onSubmit={submit}>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="text-sm font-medium text-ink-950" htmlFor="activity-code">Código de paciente</label><div className="mt-1 flex flex-wrap gap-2"><input className="admin-input min-w-0 flex-1 text-sm" data-dialog-initial id="activity-code" onChange={(event) => { lookupVersion.current += 1; setCode(event.target.value); setPatient(null); setLookupError(null); setLookingUp(false) }} value={code}/><button className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold" disabled={lookingUp || busy} onClick={() => { void lookup() }} type="button">Buscar paciente</button></div>{patient ? <p className="admin-muted mt-2 text-sm" role="status">{patient}</p> : null}{lookupError ? <p className="mt-2 text-sm text-red-700" role="alert">{lookupError}</p> : null}</div>
      <label className="text-sm font-medium text-ink-950">Fecha<input className="admin-input mt-1 w-full text-sm" onChange={(event) => setDate(event.target.value)} type="date" value={date}/></label>
      <label className="text-sm font-medium text-ink-950">Actividad<input className="admin-input mt-1 w-full text-sm" maxLength={255} onChange={(event) => setActivity(event.target.value)} value={activity}/></label>
      <label className="text-sm font-medium text-ink-950">Precio<input className="admin-input mt-1 w-full text-sm" min="0" onChange={(event) => setPrice(event.target.value)} step="0.01" type="number" value={price}/></label>
    </div>
    {validation || error ? <p className="mt-4 text-sm text-red-700" role="alert">{validation ?? error}</p> : null}
    <div className="mt-6 flex flex-wrap gap-3"><button className="admin-primary min-h-11 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy || lookingUp || Boolean(lookupError)} type="submit">{busy ? 'Guardando…' : 'Guardar'}</button><button className="admin-secondary min-h-11 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={onCancel} type="button">Volver</button></div>
  </form>
}

export function ActivitiesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const doctor = user?.role === 'doctora'
  const now = new Date()
  const [period, setPeriod] = useClinicalViewState<PeriodKind>('activities.period', () => 'mes')
  const [date, setDate] = useClinicalViewState('activities.date', () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)
  const [month, setMonth] = useClinicalViewState('activities.month', () => String(now.getMonth() + 1))
  const [year, setYear] = useClinicalViewState('activities.year', () => String(now.getFullYear()))
  const [code, setCode] = useClinicalViewState('activities.code', () => '')
  const [query, setQuery] = useClinicalViewState('activities.query', () => periodParams('mes', date, month, year, ''))
  const [dialog, setDialog] = useState<Dialog | null>(() => doctor && location.state?.dashboardAction === 'registrar-actividad' ? { kind: 'create' } : null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuTrigger = useRef<HTMLButtonElement | null>(null)
  const recordsCard = useRef<HTMLElement | null>(null)
  const [recordsMaxHeight, setRecordsMaxHeight] = useState<number | null>(null)
  const pendingMutation = useRef(false)
  const trigger = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (location.state?.dashboardAction !== 'registrar-actividad' || !doctor) return
    navigate(location.pathname, { replace: true, state: null })
  }, [doctor, location.pathname, location.state, navigate])
  useEffect(() => {
    if (!openMenuId) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node
      const popover = document.querySelector('[data-activity-menu-popover]')
      if (!menuTrigger.current?.contains(target) && !popover?.contains(target)) setOpenMenuId(null)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [openMenuId])
  const recordsQuery = useClinicalQuery(['activities', query.list], (signal) => getActivities(query.list, signal))
  const totalQuery = useClinicalQuery(['activities-total', query.total], (signal) => getActivityTotal(query.total, signal))
  useLayoutEffect(() => {
    if (!recordsQuery.data?.length) return
    const updateHeight = () => {
      if (window.innerWidth < 768 || !recordsCard.current) { setRecordsMaxHeight(null); return }
      setRecordsMaxHeight(Math.max(320, Math.floor(window.innerHeight - recordsCard.current.getBoundingClientRect().top - 24)))
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [recordsQuery.data, totalQuery.data, period, success])
  useEffect(() => {
    if (!openMenuId) return
    const reposition = () => {
      const anchor = menuTrigger.current
      const scroller = anchor?.closest('[data-activity-scroll]')
      if (!anchor?.isConnected || !scroller) { setOpenMenuId(null); return }
      const anchorRect = anchor.getBoundingClientRect()
      const scrollRect = scroller.getBoundingClientRect()
      if (anchorRect.bottom <= scrollRect.top || anchorRect.top >= scrollRect.bottom) { setOpenMenuId(null); return }
      setMenuPosition(actionMenuPosition(anchor))
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => { window.removeEventListener('scroll', reposition, true); window.removeEventListener('resize', reposition) }
  }, [openMenuId])
  const onMenuKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpenMenuId(null); menuTrigger.current?.focus(); return }
    if (!openMenuId || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-activity-menu-popover] [role=menuitem]'))
    const current = items.indexOf(document.activeElement as HTMLElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (current + 1) % items.length : (current - 1 + items.length) % items.length
    items[next]?.focus()
  }
  const load = async (): Promise<boolean> => {
    await Promise.all([markClinicalQueriesStale(['activities']), markClinicalQueriesStale(['activities-total'])])
    const [records, total] = await Promise.all([recordsQuery.refetch(), totalQuery.refetch()])
    return records.isSuccess && total.isSuccess
  }
  const openDialog = (next: Dialog, element: HTMLElement) => { trigger.current = element; setActionError(null); setDialog(next) }
  const closeDialog = () => { if (pendingMutation.current) return; setDialog(null); setActionError(null); trigger.current?.focus() }
  const mutate = async (values?: ActivityPayload) => {
    if (!dialog || pendingMutation.current) return
    pendingMutation.current = true; setBusy(true); setActionError(null)
    try {
      let message: string
      if (dialog.kind === 'create' && values) message = await createActivity(values)
      else if (dialog.kind === 'edit' && dialog.record && values) message = await updateActivity(dialog.record.id, values)
      else if (dialog.kind === 'delete' && dialog.record) message = await deleteActivity(dialog.record.id)
      else return
      void markClinicalQueriesStale(['dashboard-report'])
      void markClinicalQueriesStale(['reports'])
      if (await load()) { setSuccess(message); setDialog(null); trigger.current?.focus() }
      else setActionError('El cambio se confirmó, pero no fue posible actualizar las actividades. Reintenta la consulta.')
    } catch (cause) { setActionError(errorMessage(cause)) }
    finally { pendingMutation.current = false; setBusy(false) }
  }
  const selectedMenuRecord = recordsQuery.data?.find((record) => record.id === openMenuId)
  return <div className="admin-reveal max-w-[1390px] space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="admin-kicker">Registro diario</p><h1 className="admin-page-title mt-2">Actividades</h1><p className="admin-body mt-2">Actividades registradas para pacientes.</p></div>{doctor ? <button className="admin-primary inline-flex min-h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-semibold" onClick={(event) => openDialog({ kind: 'create' }, event.currentTarget)} type="button"><Plus aria-hidden="true" size={18}/>Registrar actividad</button> : null}</header>
    {success ? <p className="admin-success rounded-xl p-4 text-sm" role="status">{success}</p> : null}
    <section aria-label="Filtros de actividades" className="admin-surface rounded-[20px] p-3 sm:p-4 lg:flex lg:items-start lg:gap-3 xl:items-end">
      <div aria-label="Período" className="flex w-full flex-wrap gap-1 rounded-xl border border-[#dbe6f2] bg-[#f3f8fe] p-1 sm:w-fit lg:shrink-0" role="group">
        {([['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes'], ['anio', 'Año']] as const).map(([value, label]) => <button aria-pressed={period === value} className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600 sm:flex-none ${period === value ? 'bg-clinic-600 text-white shadow-sm' : 'text-[#526a87] hover:bg-white hover:text-clinic-700'}`} key={value} onClick={() => setPeriod(value)} type="button">{label}</button>)}
      </div>
      <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2 lg:mt-0 lg:flex-1 xl:flex xl:items-end">
        {period === 'dia' || period === 'semana' ? <label className="min-w-0 text-sm font-medium text-ink-950 xl:min-w-[145px] xl:flex-1">{period === 'dia' ? 'Fecha del día' : 'Fecha de la semana'}<input className="admin-input mt-1 w-full text-sm" onChange={(event) => setDate(event.target.value)} type="date" value={date}/></label> : null}
        {period === 'mes' ? <label className="min-w-0 text-sm font-medium text-ink-950 xl:min-w-[115px] xl:flex-1">Mes<select className="admin-input mt-1 w-full text-sm" onChange={(event) => setMonth(event.target.value)} value={month}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat('es-EC', { month: 'long' }).format(new Date(2000, index, 1))}</option>)}</select></label> : null}
        {period === 'mes' || period === 'anio' ? <label className="min-w-0 text-sm font-medium text-ink-950 xl:min-w-[78px] xl:flex-[0.65]">Año<input className="admin-input mt-1 w-full text-sm" onChange={(event) => setYear(event.target.value)} type="number" value={year}/></label> : null}
        <label className="min-w-0 text-sm font-medium text-ink-950 xl:min-w-[145px] xl:flex-[1.15]">Código para filtrar<input aria-label="Código de paciente para filtrar" className="admin-input mt-1 w-full text-sm" onChange={(event) => setCode(event.target.value)} placeholder="Ej. 001" value={code}/></label>
        <button className="admin-primary min-h-11 self-end whitespace-nowrap rounded-lg px-3 text-sm font-semibold xl:shrink-0" onClick={() => { if ((period === 'dia' || period === 'semana') && !date) return; if ((period === 'mes' || period === 'anio') && (!year || (period === 'mes' && !month))) return; setQuery(periodParams(period, date, month, year, code)) }} type="button">Aplicar filtros</button>
        <button className="admin-secondary min-h-11 self-end whitespace-nowrap rounded-lg px-3 text-sm font-semibold sm:col-span-2 xl:shrink-0" onClick={() => { const today = new Date(); const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`; const currentMonth = String(today.getMonth() + 1); const currentYear = String(today.getFullYear()); setPeriod('mes'); setDate(currentDate); setMonth(currentMonth); setYear(currentYear); setCode(''); setQuery(periodParams('mes', currentDate, currentMonth, currentYear, '')) }} type="button">Limpiar filtros</button>
      </div>
    </section>
    {totalQuery.data ? <section aria-label="Total económico del período" className="admin-surface flex flex-col items-start gap-2 rounded-[20px] p-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-3"><div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e7f4ff] text-clinic-600"><Wallet size={21}/></span><div className="min-w-0"><p className="admin-kicker">Total general del período</p><p className="admin-muted mt-0.5 text-sm">Incluye todas las actividades del período, aunque filtres por paciente.</p></div></div><p className="self-end text-2xl font-bold tracking-tight text-ink-950 sm:ml-auto sm:shrink-0 sm:self-auto">{formatCurrency(totalQuery.data.total)}</p></section> : totalQuery.isError ? <ErrorState description={errorMessage(totalQuery.error)} onRetry={() => { void totalQuery.refetch() }}/> : <LoadingState/>}
    {recordsQuery.data ? recordsQuery.data.length === 0 ? <EmptyState description="Sin registros para los filtros seleccionados." icon={ClipboardList} title="Sin actividades en esta vista."/> : <section aria-label="Actividades registradas" className="admin-surface flex min-h-0 min-w-0 flex-col rounded-[20px] p-3 sm:p-4" ref={recordsCard} style={recordsMaxHeight === null ? undefined : { maxHeight: recordsMaxHeight }}>
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-2 border-b border-[#e3ecf6] pb-3"><div><p className="admin-kicker">Actividad clínica</p><h2 className="mt-1 text-lg font-bold text-ink-950">Registros</h2></div><p className="admin-muted text-sm">{recordsQuery.data.length} {recordsQuery.data.length === 1 ? 'actividad' : 'actividades'}</p></div>
      <div aria-label="Lista de actividades" className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pb-1 pt-2 pr-1 sm:pr-2" data-activity-scroll role="region" tabIndex={0}>
        <IncrementalList className="space-y-2" items={recordsQuery.data} renderItem={(record) => <li className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 rounded-xl border border-[#dbe6f2] bg-white p-3 shadow-[0_3px_12px_rgba(19,55,108,0.035)] focus-within:border-[#bbd6f4] sm:flex sm:flex-wrap sm:items-center sm:gap-3 lg:grid lg:grid-cols-[40px_minmax(140px,1.1fr)_minmax(130px,1fr)_auto_40px]" key={record.id}>
          <span aria-hidden="true" className="col-start-1 row-start-1 grid size-10 shrink-0 place-items-center rounded-xl bg-[#eaf4ff] text-clinic-600"><CalendarDays size={19}/></span>
          <div className="col-start-2 row-start-1 min-w-0 sm:flex-1 sm:basis-[170px]"><p className="text-sm font-semibold text-ink-950">{record.paciente.nombres}</p><p className="admin-muted mt-0.5 text-xs">Código: {record.paciente.codigo_paciente}</p></div>
          <div className="col-span-2 row-start-2 min-w-0 sm:flex-1 sm:basis-[170px] lg:col-span-1 lg:col-start-3 lg:row-start-1"><p className="text-sm font-semibold text-ink-950">{record.actividad}</p><p className="admin-muted mt-0.5 text-xs">{formatDate(record.fecha)}</p></div>
          <strong className="col-start-3 row-start-2 shrink-0 self-start whitespace-nowrap text-base font-bold text-clinic-700 sm:self-auto lg:col-start-4 lg:row-start-1">{formatCurrency(record.precio)}</strong>
          {doctor ? <div className="col-start-3 row-start-1 ml-auto shrink-0 lg:col-start-5" data-activity-menu>
            <button aria-expanded={openMenuId === record.id} aria-haspopup="menu" aria-label={`Opciones de actividad para ${record.paciente.nombres}`} className="admin-secondary grid size-10 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" data-menu-trigger onClick={(event) => { const button = event.currentTarget; if (openMenuId === record.id) { setOpenMenuId(null); return } menuTrigger.current = button; setMenuPosition(actionMenuPosition(button)); setOpenMenuId(record.id) }} onKeyDown={onMenuKeyDown} type="button"><MoreVertical aria-hidden="true" size={18}/></button>
          </div> : null}
        </li>}/>
      </div>
    </section> : recordsQuery.isError ? <ErrorState description={errorMessage(recordsQuery.error)} onRetry={() => { void recordsQuery.refetch() }}/> : <LoadingState/>}
    {totalQuery.data && totalQuery.isError ? <p className="text-sm text-red-700" role="alert">No fue posible actualizar el total. <button className="dashboard-retry" onClick={() => { void totalQuery.refetch() }} type="button">Reintentar</button></p> : null}
    {recordsQuery.data && recordsQuery.isError ? <p className="text-sm text-red-700" role="alert">No fue posible actualizar las actividades. <button className="dashboard-retry" onClick={() => { void recordsQuery.refetch() }} type="button">Reintentar</button></p> : null}
    {doctor && selectedMenuRecord ? createPortal(<div className="fixed z-[60] w-40 rounded-xl border border-[#dbe6f2] bg-white p-1 shadow-[0_16px_36px_rgba(19,55,108,0.18)]" data-activity-menu-popover onKeyDown={onMenuKeyDown} role="menu" style={menuPosition}>
      <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-950 hover:bg-[#f2f8ff] focus-visible:outline-2 focus-visible:outline-clinic-600" onClick={() => { const anchor = menuTrigger.current; setOpenMenuId(null); if (anchor) openDialog({ kind: 'edit', record: selectedMenuRecord }, anchor) }} role="menuitem" type="button">Editar</button>
      <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600" onClick={() => { const anchor = menuTrigger.current; setOpenMenuId(null); if (anchor) openDialog({ kind: 'delete', record: selectedMenuRecord }, anchor) }} role="menuitem" type="button">Eliminar</button>
    </div>, document.body) : null}
    {dialog ? <AccessibleDialog busy={busy} onClose={closeDialog} title={dialog.kind === 'create' ? 'Registrar actividad' : dialog.kind === 'edit' ? 'Editar actividad' : 'Eliminar actividad'} titleId="activity-dialog-title">{dialog.kind === 'delete' ? <div><p className="admin-body text-sm">¿Eliminar este registro de actividad?</p>{actionError ? <p className="mt-4 text-sm text-red-700" role="alert">{actionError}</p> : null}<div className="mt-6 flex gap-3"><button className="min-h-11 rounded-lg bg-red-700 px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} onClick={() => { void mutate() }} type="button">{busy ? 'Eliminando…' : 'Confirmar eliminación'}</button><button className="admin-secondary min-h-11 rounded-lg px-5 text-sm font-semibold" disabled={busy} onClick={closeDialog} type="button">Volver</button></div></div> : <ActivityForm busy={busy} error={actionError} key={dialog.record?.id ?? 'new'} onCancel={closeDialog} onSave={mutate} record={dialog.record}/>}</AccessibleDialog> : null}
  </div>
}
