import { isAxiosError } from 'axios'
import { ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { IncrementalList } from '../../components/ui/IncrementalList'
import { markClinicalQueriesStale, useClinicalQuery } from '../../services/clinicalQuery'
import { useClinicalViewState } from '../../services/clinicalViewState'
import { formatCurrency, formatDate } from '../../utils/displayFormat'
import { createExpense, deleteExpense, getCashSummary, updateExpense, type CashMovement, type CashPeriod, type ExpenseUpdate } from './cashService'

type PeriodKind = CashPeriod['periodo']
type Dialog = { kind: 'create' | 'edit' | 'delete'; movement?: CashMovement }
const periods: { value: PeriodKind; label: string }[] = [
  { value: 'dia', label: 'Hoy' }, { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' }, { value: 'anio', label: 'Año' },
]
const inputClass = 'admin-input mt-1 w-full text-sm'

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function currentPeriod(kind: PeriodKind, date: Date): CashPeriod {
  if (kind === 'dia' || kind === 'semana') return { periodo: kind, fecha: localDate(date) }
  if (kind === 'mes') return { periodo: kind, mes: date.getMonth() + 1, anio: date.getFullYear() }
  return { periodo: kind, anio: date.getFullYear() }
}

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible comunicarse con el servidor.'
    const message = (error.response.data as { message?: unknown } | undefined)?.message
    if ([403, 404, 409, 422].includes(error.response.status) && typeof message === 'string' && message.trim()) return message
  }
  return 'No fue posible completar la operación. Inténtalo de nuevo.'
}

function ExpenseForm({ movement, today, busy, error, onSave, onCancel }: {
  movement?: CashMovement; today: string; busy: boolean; error: string | null;
  onSave: (values: ExpenseUpdate) => Promise<void>; onCancel: () => void
}) {
  const [concepto, setConcepto] = useState(movement?.concepto ?? '')
  const [monto, setMonto] = useState(movement ? String(movement.egreso) : '')
  const [validation, setValidation] = useState<string | null>(null)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const amount = Number(monto)
    if (!concepto.trim() || concepto.trim().length > 255 || !monto.trim() || !Number.isFinite(amount) || amount < 0.01 || amount > 99999999.99 || !/^\d+(?:\.\d{1,2})?$/.test(monto.trim())) {
      setValidation('Ingresa un concepto y un monto válido de hasta dos decimales.')
      return
    }
    setValidation(null)
    void onSave({ concepto: concepto.trim(), monto: amount })
  }
  return <form aria-label="Datos del egreso" noValidate onSubmit={submit}>
    <div className="grid gap-4">
      <div><span className="text-sm font-medium text-ink-950">Fecha</span><p className="admin-input mt-1 flex min-h-11 items-center text-sm text-ink-950" data-testid="expense-date">{formatDate(movement?.fecha ?? today)}</p><p className="admin-muted mt-1 text-xs">La fecha se asigna automáticamente y no se puede modificar.</p></div>
      <label className="text-sm font-medium text-ink-950">Concepto<input className={inputClass} data-dialog-initial maxLength={255} onChange={(event) => setConcepto(event.target.value)} placeholder="Ej. Compra de guantes" required value={concepto}/></label>
      <label className="text-sm font-medium text-ink-950">Monto<input className={inputClass} min="0.01" onChange={(event) => setMonto(event.target.value)} placeholder="0.00" required step="0.01" type="number" value={monto}/></label>
    </div>
    {validation || error ? <p className="mt-4 text-sm text-red-700" role="alert">{validation ?? error}</p> : null}
    <div className="mt-6 flex flex-wrap gap-3"><button className="admin-primary min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Guardando…' : 'Guardar egreso'}</button><button className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold" disabled={busy} onClick={onCancel} type="button">Cancelar</button></div>
  </form>
}

export function CashPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [period, setPeriod] = useClinicalViewState<PeriodKind>('cash.period', () => 'dia')
  const [today, setToday] = useState(() => new Date())
  const [dialog, setDialog] = useState<Dialog | null>(() => location.state?.dashboardAction === 'registrar-egreso' ? { kind: 'create' } : null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const pending = useRef(false)
  const trigger = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (location.state?.dashboardAction !== 'registrar-egreso') return
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])
  const params = currentPeriod(period, today)
  const summaryQuery = useClinicalQuery(['cash', 'summary', params], (signal) => getCashSummary(params, signal))
  const summary = summaryQuery.data

  useEffect(() => {
    const nextMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    const timeout = window.setTimeout(() => setToday(new Date()), Math.max(1, nextMidnight.getTime() - Date.now()))
    return () => window.clearTimeout(timeout)
  }, [today])

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
  const movements = summary?.movimientos ?? []
  return <div className="admin-reveal max-w-[1390px] space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="admin-kicker">Administración</p><h1 className="admin-page-title mt-2">Caja</h1><p className="admin-body mt-2">Ingresos de actividades realizadas y egresos del período actual.</p></div><button className="admin-primary min-h-11 rounded-lg px-5 text-sm font-semibold" onClick={(event) => open({ kind: 'create' }, event.currentTarget)} type="button">Registrar egreso</button></header>
    {success ? <p className="admin-success rounded-lg p-4 text-sm" role="status">{success}</p> : null}
    <section aria-label="Período de Caja" className="admin-surface rounded-[20px] p-4 sm:p-5"><div aria-label="Período" className="flex flex-wrap gap-2" role="group">{periods.map((option) => <button aria-pressed={period === option.value} className={`min-h-11 rounded-lg px-5 text-sm font-semibold transition-colors ${period === option.value ? 'admin-primary' : 'admin-secondary'}`} key={option.value} onClick={() => setPeriod(option.value)} type="button">{option.label}</button>)}</div><p className="admin-muted mt-3 text-sm">Se muestra el período en curso.</p></section>
    {summary ? <>
      <section aria-label="Resumen de Caja" className="grid gap-4 sm:grid-cols-3">{(['ingresos', 'egresos', 'saldo'] as const).map((field) => <div className="admin-surface rounded-[20px] p-5" key={field}><p className="admin-kicker capitalize">{field}</p><p className="mt-2 text-2xl font-bold text-ink-950">{formatCurrency(summary[field])}</p></div>)}</section>
      <section aria-labelledby="movements-title" className="admin-surface rounded-[20px] p-5 sm:p-6"><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-xl font-semibold text-ink-950" id="movements-title">Movimientos</h2><p className="admin-muted text-sm">{movements.length} {movements.length === 1 ? 'movimiento' : 'movimientos'}</p></div>
        {movements.length === 0 ? <div className="mt-5"><EmptyState description="Todavía no hay movimientos en este período." icon={Wallet} title="Sin movimientos"/></div> : <IncrementalList className="mt-4 divide-y divide-[#dbe6f2]" items={movements} renderItem={(movement) => <li className="flex flex-wrap items-center justify-between gap-4 py-4" key={`${movement.tipo}-${movement.id}`}><div className="flex min-w-0 items-start gap-3"><span aria-hidden="true" className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${movement.tipo === 'ingreso' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{movement.tipo === 'ingreso' ? <ArrowUpRight size={20}/> : <ArrowDownRight size={20}/>}</span><div className="min-w-0"><p className="break-words font-semibold text-ink-950">{movement.concepto}</p><p className="admin-muted mt-1 text-sm">{formatDate(movement.fecha)}{movement.tipo === 'ingreso' && movement.nombres ? ` · ${movement.nombres}` : ''}</p></div></div><div className="ml-auto flex flex-wrap items-center gap-3 sm:gap-4"><span className={`text-sm font-medium ${movement.tipo === 'ingreso' ? 'text-emerald-700' : 'text-rose-700'}`}>{movement.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</span><strong className={`min-w-20 text-right ${movement.tipo === 'ingreso' ? 'text-emerald-700' : 'text-rose-700'}`}>{movement.tipo === 'ingreso' ? '+' : '−'}{formatCurrency(movement.tipo === 'ingreso' ? movement.ingreso : movement.egreso)}</strong>{movement.tipo === 'egreso' ? <div className="flex gap-2"><button aria-label={`Editar ${movement.concepto}`} className="admin-secondary min-h-11 rounded-lg px-3 text-sm font-semibold" onClick={(event) => open({ kind: 'edit', movement }, event.currentTarget)} type="button">Editar</button><button aria-label={`Eliminar ${movement.concepto}`} className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700" onClick={(event) => open({ kind: 'delete', movement }, event.currentTarget)} type="button">Eliminar</button></div> : null}</div></li>}/>}
      </section>
    </> : summaryQuery.isError ? <ErrorState description={errorMessage(summaryQuery.error)} onRetry={() => { void summaryQuery.refetch() }}/> : <LoadingState/>}
    {summary && summaryQuery.isError ? <p className="text-sm text-red-700" role="alert">No fue posible actualizar Caja. <button className="dashboard-retry" onClick={() => { void summaryQuery.refetch() }} type="button">Reintentar</button></p> : null}
    {dialog ? <AccessibleDialog busy={busy} onClose={closeDialog} title={dialog.kind === 'create' ? 'Registrar egreso' : dialog.kind === 'edit' ? 'Editar egreso' : 'Eliminar egreso'} titleId="expense-dialog-title">{dialog.kind === 'delete' ? <div><p className="admin-body text-sm">¿Eliminar el egreso «{dialog.movement?.concepto}» del {formatDate(dialog.movement?.fecha ?? '')}? Esta acción no se puede deshacer.</p>{actionError ? <p className="mt-4 text-sm text-red-700" role="alert">{actionError}</p> : null}<div className="mt-6 flex flex-wrap gap-3"><button className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-60" data-dialog-initial disabled={busy} onClick={() => { void mutate() }} type="button">{busy ? 'Eliminando…' : 'Confirmar eliminación'}</button><button className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold" disabled={busy} onClick={closeDialog} type="button">Cancelar</button></div></div> : <ExpenseForm busy={busy} error={actionError} key={dialog.movement?.id ?? 'new'} movement={dialog.movement} onCancel={closeDialog} onSave={mutate} today={localDate(today)}/>}</AccessibleDialog> : null}
  </div>
}
