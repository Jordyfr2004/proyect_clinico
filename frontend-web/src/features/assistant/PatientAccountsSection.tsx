import { isAxiosError } from 'axios'
import { useEffect, useRef, useState } from 'react'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { IncrementalList } from '../../components/ui/IncrementalList'
import { Search, UsersRound } from 'lucide-react'
import { ProtectedPhoto } from '../auth/ProtectedPhoto'
import { activatePatientAccount, deactivatePatientAccount, getPatientAccounts, unlinkPatientAccount, type Account } from './patientAccountsService'
import { markClinicalQueriesStale, useClinicalQuery } from '../../services/clinicalQuery'
import { useClinicalViewState } from '../../services/clinicalViewState'

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
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ account: Account; action: 'desactivar' | 'desvincular' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useClinicalViewState('accounts.search', () => '')
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim())
  const pending = useRef(false)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const sectionHeading = useRef<HTMLHeadingElement | null>(null)
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250); return () => window.clearTimeout(timer) }, [search])
  const query = useClinicalQuery(['accounts', debouncedSearch], (signal) => getPatientAccounts(debouncedSearch, signal))
  const state: State = search.trim() !== debouncedSearch ? { kind: 'loading' }
    : query.data ? { kind: 'ready', accounts: query.data }
      : query.isError ? { kind: 'error', message: errorMessage(query.error) } : { kind: 'loading' }
  const load = async (): Promise<boolean> => {
    await markClinicalQueriesStale(['accounts'])
    return (await query.refetch()).isSuccess
  }
  const mutate = async (account: Account, action: 'activar' | 'desactivar' | 'desvincular') => {
    if (pending.current) return
    pending.current = true; setBusy(true); setError(null); setSuccess(null)
    try {
      const message = action === 'activar' ? await activatePatientAccount(account.id) : action === 'desactivar' ? await deactivatePatientAccount(account.id) : await unlinkPatientAccount(account.id)
      if (await load()) setSuccess(message)
      else setError('El cambio se confirmó, pero no fue posible actualizar las cuentas.')
    } catch (cause) { setError(errorMessage(cause)); if (isAxiosError(cause) && [404, 409].includes(cause.response?.status ?? 0)) await load() }
    finally { pending.current = false; setBusy(false); setConfirm(null); sectionHeading.current?.focus() }
  }
  return <section aria-labelledby="patient-accounts-title" className="admin-surface mt-8 rounded-[20px] p-6 sm:p-8">
    <p className="admin-kicker">Acceso de pacientes</p><h2 className="mt-2 text-xl font-semibold text-ink-950" id="patient-accounts-title" ref={sectionHeading} tabIndex={-1}>Cuentas de pacientes</h2>
    {success ? <p className="admin-success mt-4 rounded-lg p-3 text-sm" role="status">{success}</p> : null}
    {error ? <p className="mt-4 text-sm text-red-700" role="alert">{error}</p> : null}
    <div className="mt-5 w-full sm:max-w-[360px]"><label className="admin-meta text-xs font-semibold" htmlFor="account-search">Buscar cuentas</label><div className="relative mt-1"><Search aria-hidden="true" className="admin-meta pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={17}/><input className="admin-input admin-search-input w-full text-sm" id="account-search" maxLength={255} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, usuario o correo" type="search" value={search}/></div></div>
    {query.isFetching && state.kind === 'ready' ? <p className="admin-muted text-sm" role="status">Actualizando cuentas…</p> : null}
    {query.isError && state.kind === 'ready' ? <p className="text-sm text-red-700" role="alert">{errorMessage(query.error)} <button className="dashboard-retry" onClick={() => { void load() }} type="button">Reintentar</button></p> : null}
    {state.kind === 'loading' ? <LoadingState/> : state.kind === 'error' ? <ErrorState description={state.message} onRetry={() => { void load() }}/> : state.accounts.length === 0 ? <div className="mt-5"><EmptyState description={search.trim() ? 'No se encontraron cuentas de pacientes en los resultados del servidor.' : 'El servidor no devolvió cuentas con rol paciente.'} icon={UsersRound} title={search.trim() ? 'Sin coincidencias' : 'Sin cuentas de pacientes'}/></div> : (
      <IncrementalList className="mt-5 grid gap-3" items={state.accounts} renderItem={(account) => (
        <li className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#dbe6f2] p-4" key={account.id}>
          <div className="flex min-w-0 items-start gap-3"><ProtectedPhoto deferUntilVisible className="size-10 rounded-full text-sm font-semibold" name={account.name} photoUrl={account.paciente_id ? account.foto_perfil_url : null}/><div className="min-w-0"><p className="font-semibold text-ink-950">{account.name}</p><p className="admin-muted break-all text-sm">{account.username}{account.email ? ` · ${account.email}` : ''}</p><div className="mt-2 flex flex-wrap gap-2"><span className={`admin-pill ${account.activo ? 'admin-pill-ready' : 'admin-pill-pending'}`}>{account.activo ? 'Activa' : 'Inactiva'}</span><span className={`admin-pill ${account.paciente_id ? 'admin-pill-ready' : 'admin-pill-pending'}`}>{account.paciente_id ? 'Vinculada a expediente' : 'Desvinculada'}</span></div></div></div>
          <div className="flex flex-wrap gap-2"><button className="admin-secondary min-h-11 rounded-lg px-3 text-sm font-semibold disabled:opacity-60" disabled={busy || (!account.activo && !account.paciente_id)} onClick={(event) => { if (account.activo) { trigger.current = event.currentTarget; setConfirm({ account, action: 'desactivar' }) } else void mutate(account, 'activar') }} type="button">{account.activo ? 'Desactivar' : 'Activar'}</button>{account.paciente_id ? <button className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 disabled:opacity-60" disabled={busy} onClick={(event) => { trigger.current = event.currentTarget; setConfirm({ account, action: 'desvincular' }) }} type="button">Desvincular paciente</button> : null}</div>
        </li>
      )}/>
    )}
    {confirm ? <AccessibleDialog busy={busy} onClose={() => { if (!pending.current) { setConfirm(null); trigger.current?.focus() } }} title={confirm.action === 'desactivar' ? 'Desactivar cuenta de paciente' : 'Desvincular cuenta de paciente'} titleId="patient-account-confirm-title"><p className="admin-body text-sm">{confirm.action === 'desactivar' ? `¿Desactivar la cuenta de ${confirm.account.name}? Se cerrarán sus sesiones activas.` : `¿Desvincular la cuenta de ${confirm.account.name}? El backend también la dejará inactiva y cerrará sus sesiones.`}</p><div className="mt-6 flex flex-wrap gap-3"><button className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-60" data-dialog-initial disabled={busy} onClick={() => { void mutate(confirm.account, confirm.action) }} type="button">{busy ? 'Actualizando…' : confirm.action === 'desactivar' ? 'Confirmar desactivación' : 'Confirmar desvinculación'}</button><button className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold" disabled={busy} onClick={() => { setConfirm(null); trigger.current?.focus() }} type="button">Volver</button></div></AccessibleDialog> : null}
  </section>
}
