import { isAxiosError } from 'axios'
import { UserRound } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LoadingState } from '../../components/states/LoadingState'
import { AssistantCreateForm } from '../modules/AssistantCreateForm'
import { AssistantPasswordForm } from './AssistantPasswordForm'
import { activateAssistant, changeAssistantPassword, createAssistant, deactivateAssistant, getAssistant, type Assistant, type ChangeAssistantPasswordValues, type CreateAssistantValues } from './assistantService'

type AssistantState = { kind: 'loading' } | { kind: 'absent' } | { kind: 'ready'; assistant: Assistant } | { kind: 'error'; message: string }

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
  const [statusPending, setStatusPending] = useState(false)
  const requestId = useRef(0)

  const fetchAssistant = useCallback((): Promise<boolean> => {
    const id = ++requestId.current
    return getAssistant().then((assistant) => {
      if (id === requestId.current) setState({ kind: 'ready', assistant })
      return true
    }, (cause: unknown) => {
      if (id !== requestId.current) return false
      setState(isAxiosError(cause) && cause.response?.status === 404
        ? { kind: 'absent' }
        : { kind: 'error', message: requestError(cause, 'El servidor no pudo proporcionar datos válidos de la cuenta. Inténtalo de nuevo.') })
      return false
    })
  }, [])

  const load = (): Promise<boolean> => {
    setState({ kind: 'loading' })
    return fetchAssistant()
  }

  useEffect(() => {
    const requests = requestId
    void fetchAssistant()
    return () => { requests.current++ }
  }, [fetchAssistant])

  const onCreate = async (values: CreateAssistantValues): Promise<boolean> => {
    setCreateError(null)
    setSuccess(null)
    try {
      const assistant = await createAssistant(values)
      setState({ kind: 'ready', assistant })
      setSuccess('Cuenta de asistente creada.')
      return true
    } catch (cause) {
      setCreateError(requestError(cause, 'No fue posible crear la cuenta de asistente.'))
      return false
    }
  }

  const onToggle = async (active: boolean) => {
    setActionError(null)
    setSuccess(null)
    setStatusPending(true)
    try {
      if (active) await deactivateAssistant()
      else await activateAssistant()
      if (await load()) setSuccess(active ? 'Cuenta de asistente desactivada.' : 'Cuenta de asistente activada.')
    } catch (cause) {
      setActionError(requestError(cause, 'No fue posible actualizar el estado de la cuenta.'))
      if (isAxiosError(cause) && cause.response?.status === 404) await load()
    } finally {
      setStatusPending(false)
    }
  }

  const onChangePassword = async (values: ChangeAssistantPasswordValues): Promise<boolean> => {
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
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="border-b border-slate-200 pb-7">
        <h1 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-[2rem]">Usuarios</h1>
        <p className="mt-2 max-w-2xl leading-7 text-slate-600">Gestiona la cuenta de acceso del personal asistencial.</p>
      </div>
      {success ? <p className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900" role="status">{success}</p> : null}
      {state.kind === 'loading' ? <div className="mt-6"><LoadingState/></div> : null}
      {state.kind === 'error' ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6" role="alert">
          <p className="font-semibold text-ink-950">No pudimos cargar la información.</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{state.message}</p>
          <button className="mt-5 min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-ink-950 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" onClick={() => { void load() }} type="button">Reintentar</button>
        </section>
      ) : null}
      {state.kind === 'absent' ? (
        <div className="mt-6 grid gap-6">
          <p className="text-slate-700">No existe una cuenta de asistente registrada.</p>
          <AssistantCreateForm error={createError} onCreate={onCreate}/>
        </div>
      ) : null}
      {state.kind === 'ready' ? (
        <div className="mt-6 grid gap-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:p-8">
              <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl bg-clinic-50 text-clinic-700"><UserRound size={25}/></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold tracking-tight text-ink-950">Cuenta de asistente</h2>
                <p className="mt-2 leading-7 text-slate-600">La clínica utiliza una única cuenta con rol asistente.</p>
                <dl className="mt-6 grid gap-5 border-t border-slate-200 pt-6 sm:grid-cols-2">
                  <div><dt className="text-sm font-medium text-slate-600">Nombre</dt><dd className="mt-1 break-words text-sm text-ink-950">{state.assistant.name}</dd></div>
                  <div><dt className="text-sm font-medium text-slate-600">Correo electrónico</dt><dd className="mt-1 break-words text-sm text-ink-950">{state.assistant.email}</dd></div>
                  <div><dt className="text-sm font-medium text-slate-600">Usuario</dt><dd className="mt-1 break-words text-sm text-ink-950">{state.assistant.username}</dd></div>
                  <div><dt className="text-sm font-medium text-slate-600">Estado</dt><dd className="mt-1 text-sm text-ink-950">{state.assistant.activo ? 'Activa' : 'Inactiva'}</dd></div>
                </dl>
                {actionError ? <p className="mt-5 text-sm text-red-700" role="alert">{actionError}</p> : null}
                <button className="mt-6 min-h-11 rounded-lg border border-slate-300 px-5 text-sm font-semibold text-ink-950 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600 disabled:cursor-not-allowed disabled:opacity-60" disabled={statusPending} onClick={() => { void onToggle(state.assistant.activo) }} type="button">{statusPending ? 'Actualizando…' : state.assistant.activo ? 'Desactivar cuenta' : 'Activar cuenta'}</button>
              </div>
            </div>
          </section>
          <AssistantPasswordForm error={passwordError} onChangePassword={onChangePassword}/>
        </div>
      ) : null}
    </div>
  )
}
