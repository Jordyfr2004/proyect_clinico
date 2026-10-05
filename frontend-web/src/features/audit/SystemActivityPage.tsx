import { isAxiosError } from 'axios'
import { ClipboardList } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { formatDateTime } from '../../utils/displayFormat'
import { getRecordedActions, getRecordedSessions, hideRecordedAction, type RecordedAction, type RecordedSession } from './auditService'

type AuditState = { kind: 'loading' } | { kind: 'actions'; records: RecordedAction[] } | { kind: 'sessions'; records: RecordedSession[] } | { kind: 'error'; message: string }
const errorMessage = (error: unknown) => {
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible comunicarse con el servidor.'
    const message = (error.response.data as { message?: unknown } | undefined)?.message
    if ([403, 404, 409, 422].includes(error.response.status) && typeof message === 'string' && message.trim()) return message
  }
  return 'No fue posible cargar la actividad del sistema.'
}

export function SystemActivityPage() {
  const [view, setView] = useState<'actions' | 'sessions'>('actions')
  const [date, setDate] = useState('')
  const [appliedDate, setAppliedDate] = useState('')
  const [state, setState] = useState<AuditState>({ kind: 'loading' })
  const [confirm, setConfirm] = useState<RecordedAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const pending = useRef(false)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const requestId = useRef(0)
  const load = useCallback(async (): Promise<boolean> => {
    const id = ++requestId.current
    setState({ kind: 'loading' })
    try {
      if (view === 'actions') { const records = await getRecordedActions(appliedDate || undefined); if (id === requestId.current) setState({ kind: 'actions', records }) }
      else { const records = await getRecordedSessions(appliedDate || undefined); if (id === requestId.current) setState({ kind: 'sessions', records }) }
      return true
    } catch (cause) { if (id === requestId.current) setState({ kind: 'error', message: errorMessage(cause) }); return false }
  }, [view, appliedDate])
  useEffect(() => { const request = requestId; void Promise.resolve().then(load); return () => { request.current++ } }, [load])
  const close = () => { if (pending.current) return; setConfirm(null); setError(null); trigger.current?.focus() }
  const hide = async () => {
    if (!confirm || pending.current) return
    pending.current = true; setBusy(true); setError(null); setSuccess(null)
    try { const message = await hideRecordedAction(confirm.id); if (await load()) { setSuccess(message); setConfirm(null); trigger.current?.focus() } else setError('El cambio se confirmó, pero no fue posible actualizar las acciones.') }
    catch (cause) { setError(errorMessage(cause)) }
    finally { pending.current = false; setBusy(false) }
  }
  return <div className="admin-reveal max-w-[1260px] space-y-6"><header><p className="admin-kicker">Configuración</p><h1 className="admin-page-title mt-2">Actividad del sistema</h1><p className="admin-body mt-2">Consulta de acciones y sesiones registradas.</p></header>
    {success ? <p className="admin-success rounded-lg p-4 text-sm" role="status">{success}</p> : null}
    <div className="flex flex-wrap items-end gap-3"><div className="flex gap-2" role="group" aria-label="Vista de auditoría"><button aria-pressed={view === 'actions'} className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold" onClick={() => setView('actions')} type="button">Acciones</button><button aria-pressed={view === 'sessions'} className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold" onClick={() => setView('sessions')} type="button">Sesiones</button></div><label className="text-sm font-medium text-ink-950">Fecha<input className="admin-input ml-2 text-sm" onChange={(event) => setDate(event.target.value)} type="date" value={date}/></label><button className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold" onClick={() => setAppliedDate(date)} type="button">Aplicar fecha</button></div>
    {state.kind === 'loading' ? <LoadingState/> : state.kind === 'error' ? <ErrorState description={state.message} onRetry={() => { void load() }}/> : <section aria-label={state.kind === 'actions' ? 'Acciones registradas' : 'Sesiones registradas'} className="admin-surface rounded-[20px] p-5 sm:p-6">{state.records.length === 0 ? <EmptyState description="Sin registros para esta vista y fecha." icon={ClipboardList} title="Sin actividad registrada"/> : <ul className="divide-y divide-[#dbe6f2]">{state.kind === 'actions' ? state.records.map((record) => <li className="flex flex-wrap items-start justify-between gap-4 py-4" key={record.id}><div className="min-w-0"><p className="font-semibold text-ink-950">{record.modulo} · {record.accion}</p><p className="admin-muted mt-1 text-sm">{record.usuario ?? 'Usuario no disponible'} · {record.rol ?? 'Rol no disponible'} · {formatDateTime(record.created_at)}</p>{record.detalle ? <p className="admin-body mt-2 text-sm">{record.detalle}</p> : null}</div><button className="admin-secondary min-h-11 rounded-lg px-3 text-sm font-semibold" onClick={(event) => { trigger.current = event.currentTarget; setConfirm(record) }} type="button">Ocultar de la vista</button></li>) : state.records.map((record) => <li className="py-4" key={record.id}><p className="font-semibold text-ink-950">{record.accion}</p><p className="admin-muted mt-1 text-sm">{record.usuario ?? 'Usuario no disponible'} · {record.rol ?? 'Rol no disponible'} · {formatDateTime(record.created_at)}</p></li>)}</ul>}</section>}
    {confirm ? <AccessibleDialog busy={busy} onClose={close} title="Ocultar acción de la vista" titleId="hide-action-title"><p className="admin-body text-sm">¿Ocultar esta acción de la vista? El backend conserva el registro y cambia su visibilidad.</p>{error ? <p className="mt-4 text-sm text-red-700" role="alert">{error}</p> : null}<div className="mt-6 flex gap-3"><button className="admin-primary min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-60" data-dialog-initial disabled={busy} onClick={() => { void hide() }} type="button">{busy ? 'Actualizando…' : 'Confirmar'}</button><button className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold" disabled={busy} onClick={close} type="button">Volver</button></div></AccessibleDialog> : null}
  </div>
}
