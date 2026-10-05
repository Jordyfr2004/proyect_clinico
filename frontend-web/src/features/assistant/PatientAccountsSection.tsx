import { isAxiosError } from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { UsersRound } from 'lucide-react'
import { activatePatientAccount, deactivatePatientAccount, getPatientAccounts, unlinkPatientAccount, type Account } from './patientAccountsService'

type State = { kind: 'loading' } | { kind: 'ready'; accounts: Account[] } | { kind: 'error'; message: string }
const errorMessage = (error: unknown) => {
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible comunicarse con el servidor.'
    const message = (error.response.data as { message?: unknown } | undefined)?.message
    if ([403, 404, 409, 422].includes(error.response.status) && typeof message === 'string' && message.trim()) return message
  }
  return 'No fue posible actualizar la cuenta. Inténtalo de nuevo.'
}

export function PatientAccountsSection() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Account | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const requestId = useRef(0)
  const load = useCallback(async (): Promise<boolean> => {
    const id = ++requestId.current
    setState({ kind: 'loading' })
    try { const accounts = await getPatientAccounts(); if (id === requestId.current) setState({ kind: 'ready', accounts }); return true }
    catch (cause) { if (id === requestId.current) setState({ kind: 'error', message: errorMessage(cause) }); return false }
  }, [])
  useEffect(() => { const request = requestId; void Promise.resolve().then(load); return () => { request.current++ } }, [load])
  const mutate = async (account: Account, action: 'activar' | 'desactivar' | 'desvincular') => {
    if (pending.current) return
    pending.current = true; setBusy(true); setError(null); setSuccess(null)
    try {
      const message = action === 'activar' ? await activatePatientAccount(account.id) : action === 'desactivar' ? await deactivatePatientAccount(account.id) : await unlinkPatientAccount(account.id)
      if (await load()) setSuccess(message)
      else setError('El cambio se confirmó, pero no fue posible actualizar las cuentas.')
    } catch (cause) { setError(errorMessage(cause)); if (isAxiosError(cause) && [404, 409].includes(cause.response?.status ?? 0)) await load() }
    finally { pending.current = false; setBusy(false); setConfirm(null); trigger.current?.focus() }
  }
  return <section aria-labelledby="patient-accounts-title" className="admin-surface mt-8 rounded-[20px] p-6 sm:p-8">
    <p className="admin-kicker">Acceso de pacientes</p><h2 className="mt-2 text-xl font-semibold text-ink-950" id="patient-accounts-title">Cuentas de pacientes</h2>
    {success ? <p className="admin-success mt-4 rounded-lg p-3 text-sm" role="status">{success}</p> : null}
    {error ? <p className="mt-4 text-sm text-red-700" role="alert">{error}</p> : null}
    {state.kind === 'loading' ? <LoadingState/> : state.kind === 'error' ? <ErrorState description={state.message} onRetry={() => { void load() }}/> : state.accounts.length === 0 ? <div className="mt-5"><EmptyState description="El servidor no devolvió cuentas con rol paciente." icon={UsersRound} title="Sin cuentas de pacientes"/></div> : <ul className="mt-5 grid gap-3">{state.accounts.map((account) => <li className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#dbe6f2] p-4" key={account.id}><div className="min-w-0"><p className="font-semibold text-ink-950">{account.name}</p><p className="admin-muted break-all text-sm">{account.username}{account.email ? ` · ${account.email}` : ''}</p><div className="mt-2 flex flex-wrap gap-2"><span className={`admin-pill ${account.activo ? 'admin-pill-ready' : 'admin-pill-pending'}`}>{account.activo ? 'Activa' : 'Inactiva'}</span><span className={`admin-pill ${account.paciente_id ? 'admin-pill-ready' : 'admin-pill-pending'}`}>{account.paciente_id ? 'Vinculada a expediente' : 'Desvinculada'}</span></div></div><div className="flex flex-wrap gap-2"><button className="admin-secondary min-h-11 rounded-lg px-3 text-sm font-semibold disabled:opacity-60" disabled={busy || (!account.activo && !account.paciente_id)} onClick={() => { void mutate(account, account.activo ? 'desactivar' : 'activar') }} type="button">{account.activo ? 'Desactivar' : 'Activar'}</button>{account.paciente_id ? <button className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 disabled:opacity-60" disabled={busy} onClick={(event) => { trigger.current = event.currentTarget; setConfirm(account) }} type="button">Desvincular paciente</button> : null}</div></li>)}</ul>}
    {confirm ? <AccessibleDialog busy={busy} onClose={() => { if (!pending.current) { setConfirm(null); trigger.current?.focus() } }} title="Desvincular cuenta de paciente" titleId="unlink-patient-title"><p className="admin-body text-sm">¿Desvincular la cuenta de {confirm.name}? El backend también la dejará inactiva y cerrará sus sesiones.</p><div className="mt-6 flex gap-3"><button className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-60" data-dialog-initial disabled={busy} onClick={() => { void mutate(confirm, 'desvincular') }} type="button">{busy ? 'Actualizando…' : 'Confirmar desvinculación'}</button><button className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold" disabled={busy} onClick={() => { setConfirm(null); trigger.current?.focus() }} type="button">Volver</button></div></AccessibleDialog> : null}
  </section>
}
