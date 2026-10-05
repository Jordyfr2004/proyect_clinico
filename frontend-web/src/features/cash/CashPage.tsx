import { isAxiosError } from 'axios'
import { Wallet } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { formatCurrency, formatDate } from '../../utils/displayFormat'
import { createExpense, deleteExpense, getCashSummary, getExpenses, updateExpense, type CashPeriod, type CashSummary, type Expense, type ExpenseFilters, type ExpensePayload } from './cashService'

type CashState = { kind: 'loading' } | { kind: 'ready'; summary: CashSummary; expenses: Expense[] } | { kind: 'error'; message: string }
type Dialog = { kind: 'create' | 'edit' | 'delete'; expense?: Expense }
type PeriodKind = CashPeriod['periodo']
const inputClass = 'admin-input mt-1 w-full text-sm'
function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible comunicarse con el servidor.'
    const message = (error.response.data as { message?: unknown } | undefined)?.message
    if ([403, 404, 409, 422].includes(error.response.status) && typeof message === 'string' && message.trim()) return message
  }
  return 'No fue posible completar la operación. Inténtalo de nuevo.'
}
function filters(kind: PeriodKind, date: string, month: string, year: string): { summary: CashPeriod; expenses: ExpenseFilters } {
  const anio = Number(year)
  const mes = Number(month)
  if (kind === 'dia') return { summary: { periodo: kind, fecha: date }, expenses: { fecha: date } }
  if (kind === 'semana') return { summary: { periodo: kind, fecha: date }, expenses: { semana: date } }
  if (kind === 'mes') return { summary: { periodo: kind, mes, anio }, expenses: { mes, anio } }
  return { summary: { periodo: kind, anio }, expenses: { anio } }
}

function ExpenseForm({ expense, busy, error, onSave, onCancel }: { expense?: Expense; busy: boolean; error: string | null; onSave: (values: ExpensePayload) => Promise<void>; onCancel: () => void }) {
  const [fecha, setFecha] = useState(expense?.fecha.slice(0, 10) ?? '')
  const [concepto, setConcepto] = useState(expense?.concepto ?? '')
  const [monto, setMonto] = useState(expense ? String(expense.monto) : '')
  const [validation, setValidation] = useState<string | null>(null)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (!fecha || !concepto.trim() || concepto.trim().length > 255 || !Number.isFinite(Number(monto)) || Number(monto) < 0.01) { setValidation('Completa una fecha, un concepto y un monto válido.'); return }
    setValidation(null)
    void onSave({ fecha, concepto: concepto.trim(), monto: Number(monto) })
  }
  return <form aria-label="Datos del egreso" noValidate onSubmit={submit}><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-ink-950">Fecha<input className={inputClass} data-dialog-initial onChange={(event) => setFecha(event.target.value)} required type="date" value={fecha}/></label><label className="text-sm font-medium text-ink-950">Monto<input className={inputClass} min="0.01" onChange={(event) => setMonto(event.target.value)} required step="0.01" type="number" value={monto}/></label><label className="text-sm font-medium text-ink-950 sm:col-span-2">Concepto<input className={inputClass} maxLength={255} onChange={(event) => setConcepto(event.target.value)} required value={concepto}/></label></div>{validation || error ? <p className="mt-4 text-sm text-red-700" role="alert">{validation ?? error}</p> : null}<div className="mt-6 flex gap-3"><button className="admin-primary min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Guardando…' : 'Guardar'}</button><button className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold" disabled={busy} onClick={onCancel} type="button">Volver</button></div></form>
}

export function CashPage() {
  const now = new Date()
  const [period, setPeriod] = useState<PeriodKind>('mes')
  const [date, setDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [query, setQuery] = useState(() => filters('mes', date, month, year))
  const [state, setState] = useState<CashState>({ kind: 'loading' })
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const pending = useRef(false)
  const trigger = useRef<HTMLElement | null>(null)
  const requestId = useRef(0)
  const load = useCallback(async (): Promise<boolean> => {
    const id = ++requestId.current
    setState({ kind: 'loading' })
    try { const [summary, expenses] = await Promise.all([getCashSummary(query.summary), getExpenses(query.expenses)]); if (id === requestId.current) setState({ kind: 'ready', summary, expenses }); return true }
    catch (error) { if (id === requestId.current) setState({ kind: 'error', message: errorMessage(error) }); return false }
  }, [query])
  useEffect(() => { const request = requestId; void Promise.resolve().then(load); return () => { request.current++ } }, [load])
  const closeDialog = () => { if (pending.current) return; setDialog(null); setActionError(null); trigger.current?.focus() }
  const mutate = async (values?: ExpensePayload) => {
    if (!dialog || pending.current) return
    pending.current = true; setBusy(true); setActionError(null); setSuccess(null)
    try {
      let message: string
      if (dialog.kind === 'create' && values) message = await createExpense(values)
      else if (dialog.kind === 'edit' && dialog.expense && values) message = await updateExpense(dialog.expense.id, values)
      else if (dialog.kind === 'delete' && dialog.expense) message = await deleteExpense(dialog.expense.id)
      else return
      if (await load()) { setSuccess(message); setDialog(null); trigger.current?.focus() }
      else setActionError('El cambio se confirmó, pero no fue posible actualizar Caja. Reintenta la consulta.')
    } catch (error) { setActionError(errorMessage(error)) }
    finally { pending.current = false; setBusy(false) }
  }
  const open = (next: Dialog, element: HTMLElement) => { trigger.current = element; setActionError(null); setDialog(next) }
  return <div className="admin-reveal max-w-[1390px] space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="admin-kicker">Administración</p><h1 className="admin-page-title mt-2">Caja</h1><p className="admin-body mt-2">Resumen y egresos del período consultado.</p></div><button className="admin-primary min-h-11 rounded-lg px-5 text-sm font-semibold" onClick={(event) => open({ kind: 'create' }, event.currentTarget)} type="button">Registrar egreso</button></header>
    {success ? <p className="admin-success rounded-lg p-4 text-sm" role="status">{success}</p> : null}
    <section aria-label="Filtros de Caja" className="admin-surface rounded-[20px] p-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><label className="text-sm font-medium text-ink-950">Período<select className={inputClass} onChange={(event) => setPeriod(event.target.value as PeriodKind)} value={period}><option value="dia">Día</option><option value="semana">Semana</option><option value="mes">Mes</option><option value="anio">Año</option></select></label>{period === 'dia' || period === 'semana' ? <label className="text-sm font-medium text-ink-950">Fecha<input className={inputClass} onChange={(event) => setDate(event.target.value)} type="date" value={date}/></label> : null}{period === 'mes' ? <label className="text-sm font-medium text-ink-950">Mes<select className={inputClass} onChange={(event) => setMonth(event.target.value)} value={month}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat('es-EC', { month: 'long' }).format(new Date(now.getFullYear(), index, 1))}</option>)}</select></label> : null}{period === 'mes' || period === 'anio' ? <label className="text-sm font-medium text-ink-950">Año<input className={inputClass} onChange={(event) => setYear(event.target.value)} type="number" value={year}/></label> : null}<button className="admin-secondary min-h-11 self-end rounded-lg px-4 text-sm font-semibold" onClick={() => { if ((period === 'dia' || period === 'semana') && !date) return; if ((period === 'mes' || period === 'anio') && !year) return; setQuery(filters(period, date, month, year)) }} type="button">Aplicar filtros</button></div></section>
    {state.kind === 'loading' ? <LoadingState/> : state.kind === 'error' ? <ErrorState description={state.message} onRetry={() => { void load() }}/> : <><section aria-label="Resumen de Caja" className="grid gap-4 sm:grid-cols-3">{(['ingresos', 'egresos', 'saldo'] as const).map((field) => <div className="admin-surface rounded-[20px] p-5" key={field}><p className="admin-kicker capitalize">{field}</p><p className="mt-2 text-2xl font-bold text-ink-950">{formatCurrency(state.summary[field])}</p></div>)}</section><section aria-labelledby="expenses-title" className="admin-surface rounded-[20px] p-5 sm:p-6"><h2 className="text-xl font-semibold text-ink-950" id="expenses-title">Egresos</h2>{state.expenses.length === 0 ? <div className="mt-5"><EmptyState description="Sin egresos para el período seleccionado." icon={Wallet} title="Sin egresos en esta vista"/></div> : <ul className="mt-4 divide-y divide-[#dbe6f2]">{state.expenses.map((expense) => <li className="flex flex-wrap items-center justify-between gap-4 py-4" key={expense.id}><div><p className="font-semibold text-ink-950">{expense.concepto}</p><p className="admin-muted text-sm">{formatDate(expense.fecha)} · {formatCurrency(expense.monto)}</p></div><div className="flex gap-2"><button className="admin-secondary min-h-11 rounded-lg px-3 text-sm font-semibold" onClick={(event) => open({ kind: 'edit', expense }, event.currentTarget)} type="button">Editar</button><button className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700" onClick={(event) => open({ kind: 'delete', expense }, event.currentTarget)} type="button">Eliminar</button></div></li>)}</ul>}</section></>}
    {dialog ? <AccessibleDialog busy={busy} onClose={closeDialog} title={dialog.kind === 'create' ? 'Registrar egreso' : dialog.kind === 'edit' ? 'Editar egreso' : 'Eliminar egreso'} titleId="expense-dialog-title">{dialog.kind === 'delete' ? <div><p className="admin-body text-sm">¿Eliminar este egreso?</p>{actionError ? <p className="mt-4 text-sm text-red-700" role="alert">{actionError}</p> : null}<div className="mt-6 flex gap-3"><button className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-60" data-dialog-initial disabled={busy} onClick={() => { void mutate() }} type="button">{busy ? 'Eliminando…' : 'Confirmar eliminación'}</button><button className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold" disabled={busy} onClick={closeDialog} type="button">Volver</button></div></div> : <ExpenseForm busy={busy} error={actionError} key={dialog.expense?.id ?? 'new'} onCancel={closeDialog} onSave={mutate} expense={dialog.expense}/>}</AccessibleDialog> : null}
  </div>
}
