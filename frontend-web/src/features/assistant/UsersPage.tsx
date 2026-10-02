import { isAxiosError } from 'axios'
import { Plus, ShieldCheck, UserRound } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { AssistantCreateForm } from '../modules/AssistantCreateForm'
import { AssistantPasswordForm } from './AssistantPasswordForm'
import { activateAssistant, changeAssistantPassword, createAssistant, deactivateAssistant, deleteAssistant, getAssistant, type Assistant, type ChangeAssistantPasswordValues, type CreateAssistantValues } from './assistantService'

type AssistantState = { kind: 'loading' } | { kind: 'absent' } | { kind: 'ready'; assistant: Assistant } | { kind: 'error'; message: string }
type AssistantMutation = 'create' | 'status' | 'delete' | 'password'

function requestError(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible comunicarse con el servidor. Inténtalo de nuevo.'
    if ([404, 409, 422].includes(error.response.status)) {
      const message = (error.response.data as { message?: unknown } | undefined)?.message
      if (typeof message === 'string' && message.trim()) return message
    }
  }
  return fallback
}

export function UsersPage() {
  const [state, setState] = useState<AssistantState>({ kind: 'loading' })
  const [createError, setCreateError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mutation, setMutation] = useState<AssistantMutation | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const toggleTrigger = useRef<HTMLButtonElement>(null)
  const deleteTrigger = useRef<HTMLButtonElement>(null)
  const createTrigger = useRef<HTMLButtonElement>(null)
  const accountHeading = useRef<HTMLHeadingElement>(null)
  const focusNewAccount = useRef(false)
  const mutationPending = useRef(false)
  const requestId = useRef(0)

  const fetchAssistant = useCallback((): Promise<AssistantState> => {
    const id = ++requestId.current
    return getAssistant().then((assistant) => {
      const next: AssistantState = { kind: 'ready', assistant }
      if (id === requestId.current) setState(next)
      return next
    }, (cause: unknown) => {
      const next: AssistantState = isAxiosError(cause) && cause.response?.status === 404
        ? { kind: 'absent' }
        : { kind: 'error', message: requestError(cause, 'El servidor no pudo proporcionar datos válidos de la cuenta. Inténtalo de nuevo.') }
      if (id === requestId.current) setState(next)
      return next
    })
  }, [])

  const load = (): Promise<AssistantState> => {
    setState({ kind: 'loading' })
    return fetchAssistant()
  }

  const beginMutation = (kind: AssistantMutation): boolean => {
    if (mutationPending.current) return false
    mutationPending.current = true
    setMutation(kind)
    return true
  }

  const endMutation = () => {
    mutationPending.current = false
    setMutation(null)
  }

  useEffect(() => {
    const requests = requestId
    void fetchAssistant()
    return () => { requests.current++ }
  }, [fetchAssistant])

  useEffect(() => {
    if (state.kind === 'ready' && !createOpen && focusNewAccount.current) { accountHeading.current?.focus(); focusNewAccount.current = false }
  }, [state, createOpen])

  const closeCreate = () => {
    if (mutationPending.current) return
    setCreateOpen(false)
    setCreateError(null)
    createTrigger.current?.focus()
  }

  const onCreate = async (values: CreateAssistantValues): Promise<boolean> => {
    if (!beginMutation('create')) return false
    setCreateError(null)
    setActionError(null)
    setSuccess(null)
    try {
      const assistant = await createAssistant(values)
      focusNewAccount.current = true
      setCreateOpen(false)
      setState({ kind: 'ready', assistant })
      setSuccess('Cuenta de asistente creada.')
      return true
    } catch (cause) {
      const message = requestError(cause, 'No fue posible crear la cuenta de asistente.')
      if (isAxiosError(cause) && cause.response?.status === 409) {
        setActionError(message)
        if ((await load()).kind === 'ready') { focusNewAccount.current = true; setCreateOpen(false) }
      } else setCreateError(message)
      return false
    } finally {
      endMutation()
    }
  }

  const onToggle = async (active: boolean) => {
    if (!beginMutation('status')) return
    setActionError(null)
    setSuccess(null)
    try {
      if (active) await deactivateAssistant()
      else await activateAssistant()
      if ((await load()).kind === 'ready') setSuccess(active ? 'Cuenta de asistente desactivada.' : 'Cuenta de asistente activada.')
    } catch (cause) {
      setActionError(requestError(cause, 'No fue posible actualizar el estado de la cuenta.'))
      if (isAxiosError(cause) && [404, 409].includes(cause.response?.status ?? 0)) await load()
    } finally {
      endMutation()
      setConfirmDeactivate(false)
      toggleTrigger.current?.focus()
    }
  }

  const onDelete = async () => {
    if (!beginMutation('delete')) return
    setActionError(null)
    setSuccess(null)
    try {
      await deleteAssistant()
      const refreshed = await load()
      if (refreshed.kind === 'absent') setSuccess('Cuenta de asistente eliminada correctamente.')
      else if (refreshed.kind === 'ready') setActionError('El servidor confirmó la eliminación, pero todavía devuelve una cuenta de asistente. Vuelve a consultar el estado.')
    } catch (cause) {
      setActionError(requestError(cause, 'No fue posible eliminar la cuenta de asistente.'))
      if (isAxiosError(cause) && cause.response?.status === 404) await load()
    } finally {
      endMutation()
      setConfirmDelete(false)
      deleteTrigger.current?.focus()
    }
  }

  const onChangePassword = async (values: ChangeAssistantPasswordValues): Promise<boolean> => {
    if (!beginMutation('password')) return false
    setPasswordError(null)
    setSuccess(null)
    try {
      await changeAssistantPassword(values)
      setSuccess('Contraseña de asistente actualizada.')
      return true
    } catch (cause) {
      setPasswordError(requestError(cause, 'No fue posible cambiar la contraseña.'))
      if (isAxiosError(cause) && cause.response?.status === 404) await load()
      return false
    } finally {
      endMutation()
    }
  }

  return (
    <div className="admin-reveal max-w-[1160px]">
      <div className="pb-7">
        <p className="admin-kicker">Administración</p>
        <h1 className="admin-page-title mt-2">Usuarios</h1>
        <p className="admin-body mt-2 max-w-2xl">Gestiona la cuenta de acceso del personal asistencial.</p>
      </div>
      {success ? <p className="admin-success mt-6 rounded-lg p-4 text-sm" role="status">{success}</p> : null}
      {actionError ? <p className="mt-6 text-sm text-red-700" role="alert">{actionError}</p> : null}
      {state.kind === 'loading' ? <div className="mt-6"><LoadingState/></div> : null}
      {state.kind === 'error' ? (
        <section className="admin-surface mt-6 rounded-2xl p-6" role="alert">
          <p className="font-semibold text-ink-950">No pudimos cargar la información.</p>
          <p className="admin-muted mt-2 text-sm leading-6">{state.message}</p>
          <button className="admin-secondary mt-5 min-h-11 rounded-lg px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => { void load() }} type="button">Reintentar</button>
        </section>
      ) : null}
      {state.kind === 'absent' ? (
        <section className="admin-surface-raised mt-6 grid overflow-hidden rounded-[22px] md:grid-cols-[minmax(0,1fr)_230px]">
          <div className="p-7 sm:p-10"><span aria-hidden="true" className="admin-module-icon mb-6 size-14 rounded-[16px]"><UserRound size={26}/></span><p className="admin-kicker">Personal asistencial</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-ink-950">Cuenta de asistente</h2><p className="admin-body mt-3">No existe una cuenta de asistente registrada.</p><button className="admin-primary mt-7 inline-flex min-h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => setCreateOpen(true)} ref={createTrigger} type="button"><Plus aria-hidden="true" size={18}/>Crear asistente</button></div>
          <div className="admin-user-aside flex items-center border-t border-sky-200/20 p-7 md:border-l md:border-t-0"><div><ShieldCheck aria-hidden="true" className="text-cyan-200" size={28}/><p className="mt-4 text-sm leading-6 text-sky-100/85">La doctora administra la única cuenta de asistente desde esta sección.</p></div></div>
          {createOpen ? <AccessibleDialog onClose={closeCreate} title="Crear cuenta de asistente" titleId="assistant-create-title"><AssistantCreateForm error={createError} onCancel={closeCreate} onCreate={onCreate}/></AccessibleDialog> : null}
        </section>
      ) : null}
      {state.kind === 'ready' ? (
        <div className="mt-6 grid gap-6">
          <section className="admin-surface-raised overflow-hidden rounded-[22px]">
            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:p-8">
              <span aria-hidden="true" className="admin-avatar grid size-14 shrink-0 place-items-center rounded-[16px]"><UserRound size={26}/></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="admin-kicker">Personal asistencial</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-ink-950 focus:outline-none" ref={accountHeading} tabIndex={-1}>Cuenta de asistente</h2></div><span className={`admin-pill ${state.assistant.activo ? 'admin-pill-ready' : 'admin-pill-pending'}`}>{state.assistant.activo ? 'Activa' : 'Inactiva'}</span></div>
                <p className="admin-body mt-2">La clínica utiliza una única cuenta con rol asistente.</p>
                <dl className="mt-7 grid gap-x-8 sm:grid-cols-2">
                  <div className="admin-fact"><dt className="admin-meta text-xs font-semibold uppercase tracking-wide">Nombre</dt><dd className="mt-2 break-words font-semibold text-ink-950">{state.assistant.name}</dd></div>
                  <div className="admin-fact"><dt className="admin-meta text-xs font-semibold uppercase tracking-wide">Correo electrónico</dt><dd className="mt-2 break-words text-ink-950">{state.assistant.email}</dd></div>
                  <div className="admin-fact"><dt className="admin-meta text-xs font-semibold uppercase tracking-wide">Usuario</dt><dd className="mt-2 break-words text-ink-950">{state.assistant.username}</dd></div>
                </dl>
                <div className="admin-divider mt-7 border-t pt-6"><h3 className="text-sm font-bold text-ink-950">Acceso de la cuenta</h3><p className="admin-muted mt-1 text-sm">Activar o desactivar el acceso del asistente.</p><button aria-expanded={state.assistant.activo ? confirmDeactivate : undefined} aria-controls={confirmDeactivate ? 'assistant-deactivate-confirmation' : undefined} className="admin-secondary mt-4 min-h-11 rounded-[10px] px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={mutation !== null} onClick={() => { if (state.assistant.activo) { setConfirmDelete(false); setConfirmDeactivate(true) } else void onToggle(false) }} ref={toggleTrigger} type="button">{mutation === 'status' ? 'Actualizando…' : state.assistant.activo ? 'Desactivar cuenta' : 'Activar cuenta'}</button></div>
                {confirmDeactivate ? (
                  <div aria-labelledby="assistant-deactivate-title" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4" id="assistant-deactivate-confirmation" role="group" onKeyDown={(event) => { if (event.key === 'Escape' && mutation === null) { setConfirmDeactivate(false); toggleTrigger.current?.focus() } }}>
                    <p className="font-semibold text-ink-950" id="assistant-deactivate-title">¿Desactivar la cuenta de asistente?</p>
                    <p className="mt-2 text-sm text-slate-700">Se cerrarán sus sesiones activas.</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button autoFocus className="min-h-11 rounded-lg border border-slate-300 px-4 font-semibold text-ink-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600 disabled:opacity-60" disabled={mutation !== null} onClick={() => { setConfirmDeactivate(false); toggleTrigger.current?.focus() }} type="button">Cancelar</button>
                      <button className="min-h-11 rounded-lg bg-clinic-700 px-4 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600 disabled:opacity-60" disabled={mutation !== null} onClick={() => { void onToggle(true) }} type="button">Confirmar desactivación</button>
                    </div>
                  </div>
                ) : null}
                <div className="admin-divider mt-7 border-t pt-6">
                  <h3 className="text-sm font-bold text-[#a1394a]">Zona de peligro</h3><p className="admin-muted mt-1 text-sm">La eliminación requiere confirmación.</p><button aria-controls={confirmDelete ? 'assistant-delete-confirmation' : undefined} aria-expanded={confirmDelete} className="mt-4 min-h-11 rounded-[10px] border border-red-300 px-5 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={mutation !== null} onClick={() => { setConfirmDeactivate(false); setConfirmDelete(true) }} ref={deleteTrigger} type="button">Eliminar cuenta</button>
                </div>
                {confirmDelete ? (
                  <div aria-labelledby="assistant-delete-title" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4" id="assistant-delete-confirmation" onKeyDown={(event) => { if (event.key === 'Escape' && mutation === null) { setConfirmDelete(false); deleteTrigger.current?.focus() } }} role="group">
                    <p className="font-semibold text-ink-950" id="assistant-delete-title">¿Eliminar la cuenta de asistente?</p>
                    <p className="mt-2 text-sm text-slate-700">La cuenta será eliminada y sus sesiones activas se cerrarán. Esta acción no se puede deshacer.</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button autoFocus className="min-h-11 rounded-lg border border-slate-300 px-4 font-semibold text-ink-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600 disabled:opacity-60" disabled={mutation !== null} onClick={() => { setConfirmDelete(false); deleteTrigger.current?.focus() }} type="button">Cancelar eliminación</button>
                      <button className="min-h-11 rounded-lg bg-red-700 px-4 font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-60" disabled={mutation !== null} onClick={() => { void onDelete() }} type="button">{mutation === 'delete' ? 'Eliminando…' : 'Confirmar eliminación'}</button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
          <AssistantPasswordForm disabled={mutation !== null} error={passwordError} onChangePassword={onChangePassword}/>
        </div>
      ) : null}
    </div>
  )
}
