import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { formatCurrency } from '../../utils/displayFormat'
import { getClinicalReport, getEconomicReport, getFinancialReport, getIncomeReport } from './reportService'
import { useClinicalQuery } from '../../services/clinicalQuery'
import { useClinicalViewState } from '../../services/clinicalViewState'
import type { QueryKey } from '@tanstack/react-query'

type State<T> = { kind: 'loading' } | { kind: 'ready'; data: T } | { kind: 'error' }

function useReport<T>(key: QueryKey, request: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const query = useClinicalQuery(key, request, { enabled })
  const state: State<T> = query.data ? { kind: 'ready', data: query.data } : query.isError ? { kind: 'error' } : { kind: 'loading' }
  return { state, retry: () => { void query.refetch() }, refreshError: query.data && query.isError }
}

function ReportPanel({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return <section aria-labelledby={id} className="admin-surface rounded-[20px] p-5 sm:p-7"><h2 className="text-xl font-semibold text-ink-950" id={id}>{title}</h2><div className="mt-5">{children}</div></section>
}

function ReportState<T>({ state, retry, refreshError, children }: { state: State<T>; retry: () => void; refreshError?: boolean; children: (data: T) => ReactNode }) {
  if (state.kind === 'loading') return <LoadingState/>
  if (state.kind === 'error') return <ErrorState description="No fue posible cargar este reporte desde el servidor." onRetry={retry}/>
  return <>{refreshError ? <p className="mb-3 text-sm text-red-700" role="alert">No fue posible actualizar este reporte. <button className="dashboard-retry" onClick={retry} type="button">Reintentar</button></p> : null}{children(state.data)}</>
}

function Value({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#e0e9f4] bg-[#f8fbff] p-4"><dt className="admin-meta text-xs font-semibold">{label}</dt><dd className="mt-2 text-xl font-bold text-ink-950">{value}</dd></div>
}

export function ReportsPage() {
  const financialPanel = useRef<HTMLDivElement>(null)
  const [financialVisible, setFinancialVisible] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    if (financialVisible) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setFinancialVisible(true) }, { rootMargin: '120px' })
    if (financialPanel.current) observer.observe(financialPanel.current)
    return () => observer.disconnect()
  }, [financialVisible])
  const [yearInput, setYearInput] = useClinicalViewState('reports.yearInput', () => String(new Date().getFullYear()))
  const [year, setYear] = useClinicalViewState('reports.year', () => new Date().getFullYear())
  const clinical = useReport(['reports', 'clinical'], getClinicalReport)
  const economic = useReport(['reports', 'economic'], getEconomicReport)
  const financial = useReport(['reports', 'financial', year], (signal) => getFinancialReport(year, signal), financialVisible)
  const income = useReport(['reports', 'income'], getIncomeReport)

  return <div className="admin-reveal max-w-[1390px] space-y-6">
    <header><p className="admin-kicker">Análisis del consultorio</p><h1 className="admin-page-title mt-2">Reportes</h1><p className="admin-body mt-2">Indicadores calculados por el backend a partir de registros reales.</p></header>
    <ReportPanel title="Reporte clínico"><ReportState {...clinical}>{(data) => <><dl className="grid gap-3 sm:grid-cols-3"><Value label="Pacientes" value={String(data.total_pacientes)}/><Value label="Historiales clínicos" value={String(data.historiales_clinicos)}/><Value label="Actividades" value={String(data.total_actividades)}/></dl><h3 className="mt-6 font-semibold text-ink-950">Citas médicas</h3><dl className="mt-3 grid gap-3 sm:grid-cols-4"><Value label="Pendientes" value={String(data.citas.pendientes)}/><Value label="Programadas" value={String(data.citas.programadas)}/><Value label="Completadas" value={String(data.citas.completadas)}/><Value label="Canceladas" value={String(data.citas.canceladas)}/></dl><h3 className="mt-6 font-semibold text-ink-950">Actividades frecuentes</h3>{data.actividades_frecuentes.length ? <ul className="mt-3 divide-y divide-[#e4ecf6]">{data.actividades_frecuentes.map((item) => <li className="flex justify-between gap-4 py-3 text-sm" key={item.actividad}><span className="break-words">{item.actividad}</span><strong>{item.cantidad}</strong></li>)}</ul> : <p className="admin-muted mt-3 text-sm">No hay actividades registradas en este reporte.</p>}</>}</ReportState></ReportPanel>
    <ReportPanel title="Reporte económico"><ReportState {...economic}>{(data) => <dl className="grid gap-3 sm:grid-cols-3"><Value label="Ingresos" value={formatCurrency(data.ingresos)}/><Value label="Egresos" value={formatCurrency(data.egresos)}/><Value label="Saldo" value={formatCurrency(data.saldo)}/></dl>}</ReportState></ReportPanel>
    <div ref={financialPanel}><ReportPanel title="Reporte financiero anual"><form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); const value = Number(yearInput); if (Number.isInteger(value) && value >= 1900 && value <= 9999) { setYear(value); setFinancialVisible(true) } }}><div><label className="admin-meta block text-xs font-semibold" htmlFor="financial-year">Año</label><input className="admin-input mt-1 w-32" id="financial-year" max={9999} min={1900} onChange={(event) => setYearInput(event.target.value)} required type="number" value={yearInput}/></div><button className="admin-primary min-h-11 rounded-lg px-4 text-sm font-semibold" type="submit">Consultar</button></form><div className="mt-5"><ReportState {...financial}>{(data) => <div className="overflow-x-auto"><table className="w-full min-w-[430px] text-left text-sm"><caption className="sr-only">Ingresos, egresos y saldo por mes de {data.anio}</caption><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-3">Mes</th><th>Ingresos</th><th>Egresos</th><th>Saldo</th></tr></thead><tbody>{data.meses.map((month) => <tr className="border-b border-[#e4ecf6]" key={month.mes}><th className="py-3 font-medium">{new Intl.DateTimeFormat('es-EC', { month: 'long' }).format(new Date(data.anio, month.mes - 1, 1))}</th><td>{formatCurrency(month.ingresos)}</td><td>{formatCurrency(month.egresos)}</td><td>{formatCurrency(month.saldo)}</td></tr>)}</tbody></table></div>}</ReportState></div></ReportPanel></div>
    <ReportPanel title="Reporte de ingresos"><ReportState {...income}>{(data) => <><dl><Value label="Total de ingresos" value={formatCurrency(data.total_ingresos)}/></dl><h3 className="mt-6 font-semibold text-ink-950">Ingresos por actividad</h3>{data.por_actividad.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[380px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-3">Actividad</th><th>Cantidad</th><th>Total</th></tr></thead><tbody>{data.por_actividad.map((item) => <tr className="border-b border-[#e4ecf6]" key={item.actividad}><th className="py-3 font-medium">{item.actividad}</th><td>{item.cantidad}</td><td>{formatCurrency(item.total)}</td></tr>)}</tbody></table></div> : <p className="admin-muted mt-3 text-sm">No hay ingresos por actividad registrados.</p>}</>}</ReportState></ReportPanel>
  </div>
}
