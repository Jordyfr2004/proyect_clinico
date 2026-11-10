import { isAxiosError } from 'axios'
import { ArrowDownRight, ArrowUpRight, CalendarDays, List, MoreVertical, Plus, Trash2, Wallet } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { IncrementalList } from '../../components/ui/IncrementalList'
import { markClinicalQueriesStale, useClinicalQuery } from '../../services/clinicalQuery'
import { useClinicalViewState } from '../../services/clinicalViewState'
import { formatCurrency, formatDate } from '../../utils/displayFormat'
import { createExpense, deleteExpense, getCashSummary, updateExpense, type CashMovement, type CashPeriod, type ExpenseUpdate } from './cashService'
import './cash.css'

type PeriodKind = CashPeriod['periodo']
type Dialog = { kind: 'create' | 'edit' | 'delete'; movement?: CashMovement }
const periods: { value: PeriodKind; label: string }[] = [
  { value: 'dia', label: 'Hoy' }, { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' }, { value: 'anio', label: 'Año' },
]
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const monthValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const shortDate = (value: string) => { const [year, month, day] = value.slice(0, 10).split('-'); return `${day}/${month}/${year}` }

function periodParams(kind: PeriodKind, date: string, month: string, year: string): CashPeriod | null {
  if (kind === 'dia' || kind === 'semana') return /^\d{4}-\d{2}-\d{2}$/.test(date) ? { periodo: kind, fecha: date } : null
  if (kind === 'mes') {
    const match = /^(\d{4})-(\d{2})$/.exec(month)
    return match && Number(match[2]) >= 1 && Number(match[2]) <= 12 ? { periodo: 'mes', mes: Number(match[2]), anio: Number(match[1]) } : null
  }
  return /^\d{4}$/.test(year) ? { periodo: 'anio', anio: Number(year) } : null
}

function periodLabel(period: CashPeriod): string {
  if ('fecha' in period) return period.periodo === 'dia' ? formatDate(period.fecha) : `Semana del ${formatDate(period.fecha)}`
  if (period.periodo === 'anio') return `Año ${period.anio}`
  const month = new Intl.DateTimeFormat('es-EC', { month: 'long' }).format(new Date(period.anio, period.mes - 1, 1))
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} de ${period.anio}`
}

function menuPosition(anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect(), width = 160, height = 96, gap = 6
  return { left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)), top: Math.max(8, Math.min(rect.bottom + gap + height <= window.innerHeight - 8 ? rect.bottom + gap : rect.top - height - gap, window.innerHeight - height - 8)) }
}

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible comunicarse con el servidor.'
    const data = error.response.data as { message?: unknown; errors?: Record<string, unknown> } | undefined
    const fieldError = data?.errors && Object.values(data.errors).flat().find((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    if ([403, 404, 409, 422].includes(error.response.status) && fieldError) return fieldError
    if ([403, 404, 409, 422].includes(error.response.status) && typeof data?.message === 'string' && data.message.trim()) return data.message
  }
  return 'No fue posible completar la operación. Inténtalo de nuevo.'
}

function ExpenseForm({ movement, busy, error, onSave, onCancel }: { movement?: CashMovement; busy: boolean; error: string | null; onSave: (values: ExpenseUpdate) => Promise<void>; onCancel: () => void }) {
  const [concepto, setConcepto] = useState(movement?.concepto ?? '')
  const [monto, setMonto] = useState(movement ? Number(movement.egreso).toFixed(2) : '')
  const [validation, setValidation] = useState<string | null>(null)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const amount = Number(monto)
    if (!concepto.trim() || concepto.trim().length > 255 || !/^\d+(?:\.\d{1,2})?$/.test(monto.trim()) || !Number.isFinite(amount) || amount < 0.01 || amount > 99999999.99) { setValidation('Ingresa un concepto y un monto en USD mayor que cero, con máximo dos decimales.'); return }
    setValidation(null)
    void onSave({ concepto: concepto.trim(), monto: amount })
  }
  return <form aria-label="Datos del egreso" noValidate onSubmit={submit}>
    <div className="cash-date-note flex items-center gap-3 rounded-xl px-4 py-3"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e5f1ff] text-clinic-700"><CalendarDays size={19}/></span><div><p className="text-xs font-semibold uppercase tracking-wide text-[#617896]">Fecha · solo lectura</p><p className="text-sm font-semibold text-ink-950" data-testid="expense-date">{formatDate(movement?.fecha ?? localDate(new Date()))}</p></div></div>
    <p className="admin-muted mt-2 text-xs">{movement ? 'La fecha original se conserva al editar.' : 'La fecha actual se asigna automáticamente al registrar.'}</p>
    <div className="mt-5 grid gap-4"><label className="min-w-0 text-sm font-semibold text-ink-950">Concepto<input className="admin-input mt-1.5 w-full text-sm" data-dialog-initial maxLength={255} onChange={(event) => setConcepto(event.target.value)} placeholder="Ej. Compra de insumos" required value={concepto}/></label><div className="min-w-0"><label className="text-sm font-semibold text-ink-950" htmlFor="cash-amount">Monto (USD)</label><span className="relative mt-1.5 block"><span aria-hidden="true" className="cash-currency-symbol">$</span><input className="admin-input w-full text-sm" id="cash-amount" inputMode="decimal" max="99999999.99" min="0.01" onChange={(event) => setMonto(event.target.value)} placeholder="0.00" required step="0.01" style={{ paddingLeft: '2.5rem' }} type="number" value={monto}/></span></div></div>
    {validation || error ? <p className="mt-4 text-sm text-red-700" role="alert">{validation ?? error}</p> : null}
    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#e3ecf6] pt-4 sm:flex-row sm:justify-end"><button className="admin-secondary min-h-11 rounded-[10px] px-5 text-sm font-semibold" disabled={busy} onClick={onCancel} type="button">Cancelar</button><button className="admin-primary min-h-11 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Guardando…' : movement ? 'Guardar cambios' : 'Registrar egreso'}</button></div>
  </form>
}

export function CashPage() {
  const location = useLocation(), navigate = useNavigate(), now = new Date()
  const [period, setPeriod] = useClinicalViewState<PeriodKind>('cash.period', () => 'dia')
  const [date, setDate] = useClinicalViewState('cash.date', () => localDate(now))
  const [month, setMonth] = useClinicalViewState('cash.month', () => monthValue(now))
  const [year, setYear] = useClinicalViewState('cash.year', () => String(now.getFullYear()))
  const [query, setQuery] = useClinicalViewState<CashPeriod>('cash.query', () => ({ periodo: 'dia', fecha: localDate(now) }))
  const [filterError, setFilterError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(() => location.state?.dashboardAction === 'registrar-egreso' ? { kind: 'create' } : null)
  const [busy, setBusy] = useState(false), [actionError, setActionError] = useState<string | null>(null), [success, setSuccess] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null), [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })
  const pending = useRef(false), trigger = useRef<HTMLElement | null>(null), menuTrigger = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { if (location.state?.dashboardAction === 'registrar-egreso') navigate(location.pathname, { replace: true, state: null }) }, [location.pathname, location.state, navigate])
  const summaryQuery = useClinicalQuery(['cash', 'summary', query], (signal) => getCashSummary(query, signal))
  const summary = summaryQuery.data, movements = summary?.movimientos ?? []
  const selectedExpense = movements.find((movement) => movement.tipo === 'egreso' && movement.id === openMenuId)
  const draft = periodParams(period, date, month, year)
  const filtersPending = !draft || JSON.stringify(draft) !== JSON.stringify(query)

  useEffect(() => {
    if (!openMenuId) return
    const onOutsidePointer = (event: PointerEvent) => { const target = event.target as Node; if (!menuTrigger.current?.contains(target) && !document.querySelector('[data-cash-menu-popover]')?.contains(target)) setOpenMenuId(null) }
    document.addEventListener('pointerdown', onOutsidePointer)
    return () => document.removeEventListener('pointerdown', onOutsidePointer)
  }, [openMenuId])
  useEffect(() => {
    if (!openMenuId) return
    const reposition = () => {
      const anchor = menuTrigger.current, scroller = anchor?.closest('[data-cash-scroll]')
      if (!anchor?.isConnected || !scroller) { setOpenMenuId(null); return }
      const bounds = anchor.getBoundingClientRect(), scrollBounds = scroller.getBoundingClientRect()
      if (bounds.bottom <= scrollBounds.top || bounds.top >= scrollBounds.bottom) { setOpenMenuId(null); return }
      setPopoverPosition(menuPosition(anchor))
    }
    window.addEventListener('scroll', reposition, true); window.addEventListener('resize', reposition)
    return () => { window.removeEventListener('scroll', reposition, true); window.removeEventListener('resize', reposition) }
  }, [openMenuId])
  const onMenuKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpenMenuId(null); menuTrigger.current?.focus(); return }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-cash-menu-popover] [role=menuitem]'))
    if (!items.length) return
    const current = items.indexOf(document.activeElement as HTMLElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (current + 1) % items.length : (current - 1 + items.length) % items.length
    items[next]?.focus()
  }
  const applyFilters = (kind = period) => { const next = periodParams(kind, date, month, year); if (!next) { setFilterError('Selecciona una fecha o un año válido.'); return } setFilterError(null); setOpenMenuId(null); setQuery(next) }
  const clearFilters = () => { const current = new Date(), currentDate = localDate(current); setPeriod('dia'); setDate(currentDate); setMonth(monthValue(current)); setYear(String(current.getFullYear())); setQuery({ periodo: 'dia', fecha: currentDate }); setFilterError(null); setOpenMenuId(null) }
  const closeDialog = () => { if (pending.current) return; setDialog(null); setActionError(null); trigger.current?.focus() }
  const open = (next: Dialog, element: HTMLElement) => { trigger.current = element; setActionError(null); setSuccess(null); setDialog(next) }
  const mutate = async (values?: ExpenseUpdate) => {
    if (!dialog || pending.current) return
    pending.current = true; setBusy(true); setActionError(null); setSuccess(null)
    try {
      let message: string
      if (dialog.kind === 'create' && values) message = await createExpense({ ...values, fecha: localDate(new Date()) })
      else if (dialog.kind === 'edit' && dialog.movement && values) message = await updateExpense(dialog.movement.id, values)
      else if (dialog.kind === 'delete' && dialog.movement) message = await deleteExpense(dialog.movement.id)
      else return
      setDialog(null); trigger.current?.focus()
      await Promise.all([markClinicalQueriesStale(['cash']), markClinicalQueriesStale(['dashboard-report']), markClinicalQueriesStale(['reports'])])
      const refreshed = await summaryQuery.refetch()
      setSuccess(refreshed.isSuccess ? message : `${message} No fue posible actualizar Caja; vuelve a intentar la consulta.`)
    } catch (error) { setActionError(errorMessage(error)) }
    finally { pending.current = false; setBusy(false) }
  }
  return <div className="admin-reveal cash-page max-w-[1390px] min-w-0 space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="admin-kicker">Gestión financiera</p><h1 className="admin-page-title mt-1">Caja</h1><p className="admin-body mt-1 text-sm sm:text-base">Control de ingresos y egresos de la clínica.</p></div><button className="admin-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold" onClick={(event) => open({ kind: 'create' }, event.currentTarget)} type="button"><Plus aria-hidden="true" size={19}/>Registrar egreso</button></header>
    {success ? <p className="admin-success rounded-lg p-3 text-sm" role="status">{success}</p> : null}
    <section aria-label="Período de Caja" className="admin-surface cash-filters rounded-[20px] p-3 sm:p-4"><div className="flex flex-wrap items-end gap-3"><div aria-label="Período" className="cash-period-switch flex flex-wrap gap-1 rounded-xl bg-[#eff5fc] p-1" role="group">{periods.map((option) => <button aria-pressed={period === option.value} className={period === option.value ? 'cash-period-active' : ''} key={option.value} onClick={() => { setPeriod(option.value); applyFilters(option.value) }} type="button">{option.label}</button>)}</div><label className="cash-period-field min-w-0 text-xs font-semibold text-[#526a87]">{period === 'dia' ? 'Fecha' : period === 'semana' ? 'Fecha de la semana' : period === 'mes' ? 'Mes' : 'Año'}{period === 'dia' || period === 'semana' ? <input aria-label={period === 'dia' ? 'Fecha del reporte' : 'Fecha de la semana'} className="admin-input mt-1 w-full text-sm" onChange={(event) => setDate(event.target.value)} type="date" value={date}/> : period === 'mes' ? <input aria-label="Mes del reporte" className="admin-input mt-1 w-full text-sm" onChange={(event) => setMonth(event.target.value)} type="month" value={month}/> : <input aria-label="Año del reporte" className="admin-input mt-1 w-full text-sm" inputMode="numeric" max="9999" min="1000" onChange={(event) => setYear(event.target.value)} type="number" value={year}/>}</label><button className="admin-primary min-h-11 rounded-[10px] px-4 text-sm font-semibold" onClick={() => applyFilters()} type="button">Aplicar</button><button className="admin-secondary min-h-11 rounded-[10px] px-4 text-sm font-semibold" onClick={clearFilters} type="button">Ir al período actual</button></div><div className="mt-2 flex flex-wrap items-center gap-2"><p className="admin-muted text-xs sm:text-sm">Período consultado: <strong className="text-ink-950">{periodLabel(query)}</strong></p>{filtersPending ? <span className="rounded-full bg-[#eaf4ff] px-2 py-0.5 text-xs font-semibold text-clinic-700" role="status">Cambios sin aplicar</span> : null}</div>{filterError ? <p className="mt-2 text-sm text-red-700" role="alert">{filterError}</p> : null}</section>
    {summary ? <>
      <section aria-label="Resumen de Caja" className="grid gap-3 md:grid-cols-3">{([{ field: 'ingresos', label: 'Ingresos', icon: ArrowUpRight, tone: 'income' }, { field: 'egresos', label: 'Egresos', icon: ArrowDownRight, tone: 'expense' }, { field: 'saldo', label: 'Saldo', icon: Wallet, tone: 'balance' }] as const).map(({ field, label, icon: Icon, tone }) => <div className={`admin-surface cash-kpi cash-kpi-${tone} flex min-w-0 items-center gap-4 rounded-[20px] p-4`} key={field}><span aria-hidden="true" className="cash-kpi-icon grid size-12 shrink-0 place-items-center rounded-xl"><Icon size={23}/></span><div className="min-w-0"><p className="text-sm font-semibold text-ink-950">{label}</p><p className="cash-kpi-value mt-0.5 break-words text-2xl font-bold tracking-tight">{formatCurrency(summary[field])}</p></div></div>)}</section>
      <section aria-labelledby="movements-title" className="admin-surface cash-movements min-w-0 rounded-[20px] p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-3 pb-3"><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-[#e7f2ff] text-clinic-700"><List size={20}/></span><div><h2 className="text-lg font-bold text-ink-950" id="movements-title">Movimientos</h2><p className="admin-muted text-xs sm:text-sm">Ingresos y egresos de {periodLabel(query)}.</p></div></div><span className="rounded-full bg-[#eef4fa] px-3 py-1 text-xs font-semibold text-[#526a87]">{movements.length} {movements.length === 1 ? 'movimiento' : 'movimientos'}</span></div>
        {movements.length === 0 ? <div className="cash-empty rounded-xl border border-dashed border-[#ccdcef] bg-[#f7faff] px-4 py-6 text-center"><Wallet aria-hidden="true" className="mx-auto text-[#829cba]" size={24}/><p className="mt-2 text-sm font-semibold text-ink-950">Sin movimientos en este período</p><p className="admin-muted mt-0.5 text-xs">Elige otro período para consultar ingresos y egresos.</p></div> : <div aria-label="Lista de movimientos" className="cash-movements-scroll min-w-0 overscroll-contain" data-cash-scroll role="region" tabIndex={0}><div className="cash-table-head hidden md:grid"><span>Fecha</span><span>Concepto</span><span>Tipo</span><span>Paciente</span><span>Monto</span><span className="text-center">Acciones</span></div><IncrementalList className="cash-movement-list" items={movements} renderItem={(movement) => <li className="cash-movement-row min-w-0" key={`${movement.tipo}-${movement.id}`}><span className="cash-movement-date flex items-center gap-2 text-sm text-[#526a87]"><CalendarDays aria-hidden="true" className="shrink-0 text-clinic-600" size={16}/>{shortDate(movement.fecha)}</span><span className="cash-movement-concept min-w-0 break-words text-sm font-semibold text-ink-950">{movement.concepto}</span><span className={`cash-type cash-type-${movement.tipo} inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold`}>{movement.tipo === 'ingreso' ? <ArrowUpRight aria-hidden="true" size={15}/> : <ArrowDownRight aria-hidden="true" size={15}/>} {movement.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</span><span className="cash-movement-patient min-w-0 break-words text-sm text-[#526a87]">{movement.tipo === 'ingreso' && movement.nombres ? <>{movement.nombres}{movement.codigo_paciente ? <small className="block text-xs">Código: {movement.codigo_paciente}</small> : null}</> : <span aria-label="Sin paciente">—</span>}</span><strong className={`cash-movement-amount text-sm ${movement.tipo === 'ingreso' ? 'text-emerald-700' : 'text-red-700'}`}>{movement.tipo === 'ingreso' ? '+' : '−'}{formatCurrency(movement.tipo === 'ingreso' ? movement.ingreso : movement.egreso)}</strong><span className="cash-movement-action flex justify-end">{movement.tipo === 'egreso' ? <button aria-expanded={openMenuId === movement.id} aria-haspopup="menu" aria-label={`Opciones de egreso para ${movement.concepto}`} className="admin-secondary grid size-9 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" onClick={(event) => { const button = event.currentTarget; if (openMenuId === movement.id) { setOpenMenuId(null); return } menuTrigger.current = button; setPopoverPosition(menuPosition(button)); setOpenMenuId(movement.id) }} onKeyDown={onMenuKeyDown} type="button"><MoreVertical aria-hidden="true" size={18}/></button> : null}</span></li>}/></div>}
      </section>
    </> : summaryQuery.isError ? <ErrorState description={errorMessage(summaryQuery.error)} onRetry={() => { void summaryQuery.refetch() }}/> : <LoadingState/>}
    {summary && summaryQuery.isError ? <p className="text-sm text-red-700" role="alert">No fue posible actualizar Caja. <button className="dashboard-retry" onClick={() => { void summaryQuery.refetch() }} type="button">Reintentar</button></p> : null}
    {selectedExpense ? createPortal(<div className="cash-action-popover fixed z-[60] w-40 rounded-xl border border-[#dbe6f2] bg-white p-1 shadow-[0_16px_36px_rgba(19,55,108,0.2)]" data-cash-menu-popover onKeyDown={onMenuKeyDown} role="menu" style={popoverPosition}><button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-950 hover:bg-[#f2f8ff] focus-visible:outline-2 focus-visible:outline-clinic-600" onClick={() => { const anchor = menuTrigger.current; setOpenMenuId(null); if (anchor) open({ kind: 'edit', movement: selectedExpense }, anchor) }} role="menuitem" type="button">Editar</button><button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600" onClick={() => { const anchor = menuTrigger.current; setOpenMenuId(null); if (anchor) open({ kind: 'delete', movement: selectedExpense }, anchor) }} role="menuitem" type="button">Eliminar</button></div>, document.body) : null}
    {dialog ? <AccessibleDialog busy={busy} onClose={closeDialog} title={dialog.kind === 'create' ? 'Registrar egreso' : dialog.kind === 'edit' ? 'Editar egreso' : 'Eliminar egreso'} titleId="expense-dialog-title">{dialog.kind === 'delete' && dialog.movement ? <div><div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"><Trash2 aria-hidden="true" className="mt-0.5 shrink-0 text-red-700" size={20}/><div><p className="text-sm font-semibold text-red-800">¿Eliminar este egreso?</p><p className="mt-1 text-sm text-red-700">Esta acción no se puede deshacer.</p></div></div><dl className="mt-4 grid gap-3 rounded-xl border border-[#dbe6f2] bg-[#f7faff] p-4 sm:grid-cols-2"><div className="sm:col-span-2"><dt className="admin-muted text-xs">Concepto</dt><dd className="break-words text-sm font-semibold text-ink-950">{dialog.movement.concepto}</dd></div><div><dt className="admin-muted text-xs">Fecha</dt><dd className="text-sm font-semibold text-ink-950">{formatDate(dialog.movement.fecha)}</dd></div><div><dt className="admin-muted text-xs">Monto</dt><dd className="text-sm font-semibold text-red-700">{formatCurrency(dialog.movement.egreso)}</dd></div></dl>{actionError ? <p className="mt-4 text-sm text-red-700" role="alert">{actionError}</p> : null}<div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#e3ecf6] pt-4 sm:flex-row sm:justify-end"><button className="admin-secondary min-h-11 rounded-[10px] px-5 text-sm font-semibold" data-dialog-initial disabled={busy} onClick={closeDialog} type="button">Cancelar</button><button className="min-h-11 rounded-[10px] bg-red-700 px-5 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-60" disabled={busy} onClick={() => { void mutate() }} type="button">{busy ? 'Eliminando…' : 'Confirmar eliminación'}</button></div></div> : <ExpenseForm busy={busy} error={actionError} key={dialog.movement?.id ?? 'new'} movement={dialog.movement} onCancel={closeDialog} onSave={mutate}/>}</AccessibleDialog> : null}
  </div>
}
