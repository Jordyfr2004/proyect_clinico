import { isAxiosError } from 'axios'
import { ClipboardList, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { formatCurrency, formatDate } from '../../utils/displayFormat'
import { useAuth } from '../auth/authContext'
import { createActivity, deleteActivity, getActivities, getActivityTotal, lookupPatientByCode, updateActivity, type Activity, type ActivityFilters, type ActivityPayload, type ActivityPeriod } from './activityService'

type PeriodKind = ActivityPeriod['periodo']
type ActivityState = { kind: 'loading' } | { kind: 'ready'; records: Activity[]; total: string } | { kind: 'error'; message: string }
type Dialog = { kind: 'create' | 'edit' | 'delete'; record?: Activity }

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
  const lookup = async () => {
    if (!code.trim()) { setLookupError('Ingresa un código de paciente.'); return }
    setLookingUp(true); setLookupError(null); setPatient(null)
    try { const found = await lookupPatientByCode(code.trim()); setPatient(found.nombres) }
    catch (cause) { setLookupError(errorMessage(cause)) }
    finally { setLookingUp(false) }
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!code.trim() || !date || !activity.trim() || price === '' || !Number.isFinite(Number(price)) || Number(price) < 0) { setValidation('Completa el código, la fecha, la actividad y un precio válido.'); return }
    if (lookupError) return
    void onSave({ codigo_paciente: code.trim(), fecha: date, actividad: activity.trim(), precio: Number(price) })
  }
  return <form aria-label="Datos de actividad" noValidate onSubmit={submit}>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="text-sm font-medium text-ink-950" htmlFor="activity-code">Código de paciente</label><div className="mt-1 flex flex-wrap gap-2"><input className="admin-input min-w-0 flex-1 text-sm" data-dialog-initial id="activity-code" onChange={(event) => { setCode(event.target.value); setPatient(null); setLookupError(null) }} value={code}/><button className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold" disabled={lookingUp || busy} onClick={() => { void lookup() }} type="button">Buscar paciente</button></div>{patient ? <p className="admin-muted mt-2 text-sm" role="status">{patient}</p> : null}{lookupError ? <p className="mt-2 text-sm text-red-700" role="alert">{lookupError}</p> : null}</div>
      <label className="text-sm font-medium text-ink-950">Fecha<input className="admin-input mt-1 w-full text-sm" onChange={(event) => setDate(event.target.value)} type="date" value={date}/></label>
      <label className="text-sm font-medium text-ink-950">Actividad<input className="admin-input mt-1 w-full text-sm" maxLength={255} onChange={(event) => setActivity(event.target.value)} value={activity}/></label>
      <label className="text-sm font-medium text-ink-950">Precio<input className="admin-input mt-1 w-full text-sm" min="0" onChange={(event) => setPrice(event.target.value)} step="0.01" type="number" value={price}/></label>
    </div>
    {validation || error ? <p className="mt-4 text-sm text-red-700" role="alert">{validation ?? error}</p> : null}
    <div className="mt-6 flex flex-wrap gap-3"><button className="admin-primary min-h-11 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy || lookingUp || Boolean(lookupError)} type="submit">{busy ? 'Guardando…' : 'Guardar'}</button><button className="admin-secondary min-h-11 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={onCancel} type="button">Volver</button></div>
  </form>
}

export function ActivitiesPage() {
  const { user } = useAuth()
  const doctor = user?.role === 'doctora'
  const now = new Date()
  const [period, setPeriod] = useState<PeriodKind>('mes')
  const [date, setDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [code, setCode] = useState('')
  const [query, setQuery] = useState(() => periodParams('mes', date, month, year, ''))
  const [state, setState] = useState<ActivityState>({ kind: 'loading' })
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const pendingMutation = useRef(false)
  const trigger = useRef<HTMLElement | null>(null)
  const requestId = useRef(0)
  const load = useCallback(async (): Promise<boolean> => {
    const id = ++requestId.current
    setState({ kind: 'loading' })
    try { const [records, result] = await Promise.all([getActivities(query.list), getActivityTotal(query.total)]); if (id === requestId.current) setState({ kind: 'ready', records, total: result.total }); return true }
    catch (cause) { if (id === requestId.current) setState({ kind: 'error', message: errorMessage(cause) }); return false }
  }, [query])
  useEffect(() => {
    let active = true
    const currentRequest = requestId
    void Promise.resolve().then(() => { if (active) return load() })
    return () => { active = false; currentRequest.current++ }
  }, [load])
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
      if (await load()) { setSuccess(message); setDialog(null); trigger.current?.focus() }
      else setActionError('El cambio se confirmó, pero no fue posible actualizar las actividades. Reintenta la consulta.')
    } catch (cause) { setActionError(errorMessage(cause)) }
    finally { pendingMutation.current = false; setBusy(false) }
  }
  return <div className="admin-reveal max-w-[1390px] space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="admin-kicker">Registro diario</p><h1 className="admin-page-title mt-2">Actividades</h1><p className="admin-body mt-2">Actividades registradas para pacientes.</p></div>{doctor ? <button className="admin-primary inline-flex min-h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-semibold" onClick={(event) => openDialog({ kind: 'create' }, event.currentTarget)} type="button"><Plus aria-hidden="true" size={18}/>Registrar actividad</button> : null}</header>
    {success ? <p className="admin-success rounded-xl p-4 text-sm" role="status">{success}</p> : null}
    <section aria-label="Filtros de actividades" className="admin-surface rounded-[20px] p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><label className="text-sm font-medium text-ink-950">Período<select className="admin-input mt-1 w-full text-sm" onChange={(event) => setPeriod(event.target.value as PeriodKind)} value={period}><option value="dia">Día</option><option value="semana">Semana</option><option value="mes">Mes</option><option value="anio">Año</option></select></label>{period === 'dia' || period === 'semana' ? <label className="text-sm font-medium text-ink-950">Fecha<input className="admin-input mt-1 w-full text-sm" onChange={(event) => setDate(event.target.value)} type="date" value={date}/></label> : null}{period === 'mes' ? <label className="text-sm font-medium text-ink-950">Mes<select className="admin-input mt-1 w-full text-sm" onChange={(event) => setMonth(event.target.value)} value={month}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat('es-EC', { month: 'long' }).format(new Date(2000, index, 1))}</option>)}</select></label> : null}{period === 'mes' || period === 'anio' ? <label className="text-sm font-medium text-ink-950">Año<input className="admin-input mt-1 w-full text-sm" onChange={(event) => setYear(event.target.value)} type="number" value={year}/></label> : null}<label className="text-sm font-medium text-ink-950">Código de paciente para filtrar<input className="admin-input mt-1 w-full text-sm" onChange={(event) => setCode(event.target.value)} value={code}/></label><button className="admin-secondary min-h-11 self-end rounded-lg px-4 text-sm font-semibold" onClick={() => { if ((period === 'dia' || period === 'semana') && !date) return; if ((period === 'mes' || period === 'anio') && (!year || (period === 'mes' && !month))) return; setQuery(periodParams(period, date, month, year, code)) }} type="button">Aplicar filtros</button></div></section>
    {state.kind === 'error' ? <ErrorState description={state.message} onRetry={() => { void load() }}/ > : state.kind === 'loading' ? <LoadingState/> : <><section className="admin-surface rounded-[20px] p-5 sm:p-6"><p className="admin-kicker">Total general del período</p><p className="mt-2 text-2xl font-bold text-ink-950">{formatCurrency(state.total)}</p><p className="admin-muted mt-1 text-xs">Calculado por el servidor para el período seleccionado{query.list.codigo_paciente ? ', sin aplicar el filtro de paciente' : ''}.</p></section>{state.records.length === 0 ? <EmptyState description="Sin registros para los filtros seleccionados." icon={ClipboardList} title="Sin actividades en esta vista."/> : <section aria-label="Actividades registradas" className="admin-surface overflow-hidden rounded-[20px]"><h2 className="border-b border-[#dbe6f2] px-5 py-5 text-lg font-bold text-ink-950 sm:px-6">Registros</h2><ul>{state.records.map((record) => <li className="grid gap-3 border-b border-[#e0eaf5] px-5 py-4 last:border-b-0 sm:px-6 xl:grid-cols-[140px_110px_minmax(120px,1fr)_minmax(160px,1.2fr)_100px_auto] xl:items-center" key={record.id}><span className="text-sm text-ink-950">{formatDate(record.fecha)}</span><span className="admin-muted text-sm">{record.paciente.codigo_paciente}</span><span className="text-sm font-semibold text-ink-950">{record.paciente.nombres}</span><span className="admin-muted text-sm">{record.actividad}</span><span className="text-sm font-semibold text-ink-950">{formatCurrency(record.precio)}</span>{doctor ? <span className="flex gap-2"><button className="admin-secondary min-h-10 rounded-lg px-3 text-xs font-semibold" onClick={(event) => openDialog({ kind: 'edit', record }, event.currentTarget)} type="button">Editar</button><button className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700" onClick={(event) => openDialog({ kind: 'delete', record }, event.currentTarget)} type="button">Eliminar</button></span> : null}</li>)}</ul></section>}</>}
    {dialog ? <AccessibleDialog busy={busy} onClose={closeDialog} title={dialog.kind === 'create' ? 'Registrar actividad' : dialog.kind === 'edit' ? 'Editar actividad' : 'Eliminar actividad'} titleId="activity-dialog-title">{dialog.kind === 'delete' ? <div><p className="admin-body text-sm">¿Eliminar este registro de actividad?</p>{actionError ? <p className="mt-4 text-sm text-red-700" role="alert">{actionError}</p> : null}<div className="mt-6 flex gap-3"><button className="min-h-11 rounded-lg bg-red-700 px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} onClick={() => { void mutate() }} type="button">{busy ? 'Eliminando…' : 'Confirmar eliminación'}</button><button className="admin-secondary min-h-11 rounded-lg px-5 text-sm font-semibold" disabled={busy} onClick={closeDialog} type="button">Volver</button></div></div> : <ActivityForm busy={busy} error={actionError} key={dialog.record?.id ?? 'new'} onCancel={closeDialog} onSave={mutate} record={dialog.record}/>}</AccessibleDialog> : null}
  </div>
}
