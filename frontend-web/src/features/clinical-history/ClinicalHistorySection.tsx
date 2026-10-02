import { isAxiosError } from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ZodError } from 'zod'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { useAuth } from '../auth/authContext'
import type { Patient } from '../patients/patientService'
import { ClinicalHistoryForm } from './ClinicalHistoryForm'
import { createClinicalHistory, getClinicalHistoryByPatient, updateClinicalHistory, type ClinicalHistory, type ClinicalHistoryFields } from './clinicalHistoryService'

type HistoryState = { kind: 'loading' } | { kind: 'absent' } | { kind: 'ready'; history: ClinicalHistory } | { kind: 'error'; message: string }

function historyError(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible comunicarse con el servidor. Inténtalo de nuevo.'
    if (error.response.status === 422) {
      const message = (error.response.data as { message?: unknown } | undefined)?.message
      if (typeof message === 'string' && message.trim() && message.length <= 300 && !/exception|stack|token|password|sqlstate/i.test(message)) return message
      return 'Revisa los datos del historial clínico.'
    }
    if (error.response.status === 404) return 'El historial clínico ya no está disponible. Vuelve a consultar el expediente.'
    if (error.response.status === 403) return 'No tienes permiso para modificar este historial clínico.'
    if (error.response.status === 401) return 'Tu sesión ya no está disponible.'
  }
  return 'No fue posible verificar el historial clínico. Inténtalo de nuevo.'
}

export function ClinicalHistorySection() {
  const patient = useOutletContext<Patient>()
  const { user } = useAuth()
  const canWrite = user?.role === 'doctora'
  const [state, setState] = useState<HistoryState>({ kind: 'loading' })
  const [editing, setEditing] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const mutationPending = useRef(false)
  const requestId = useRef(0)
  const editTrigger = useRef<HTMLButtonElement>(null)
  const restoreEditFocus = useRef(false)

  const load = useCallback(async (): Promise<HistoryState> => {
    const id = ++requestId.current
    let next: HistoryState
    try {
      const history = await getClinicalHistoryByPatient(patient.id)
      if (history.paciente_id !== patient.id) throw new Error('Invalid clinical history patient')
      next = { kind: 'ready', history }
    } catch (error) {
      next = isAxiosError(error) && error.response?.status === 404
        ? { kind: 'absent' }
        : { kind: 'error', message: historyError(error) }
    }
    if (id === requestId.current) setState(next)
    return next
  }, [patient.id])

  useEffect(() => {
    const activeRequest = requestId
    void load()
    return () => { activeRequest.current++ }
  }, [load])

  useEffect(() => {
    if (!editing && restoreEditFocus.current) {
      editTrigger.current?.focus()
      restoreEditFocus.current = false
    }
  }, [editing])

  const save = async (values: ClinicalHistoryFields) => {
    if (mutationPending.current) return
    mutationPending.current = true
    setMutationError(null)
    setSuccess(null)
    try {
      const history = state.kind === 'ready'
        ? await updateClinicalHistory(state.history.id, values)
        : await createClinicalHistory({ paciente_id: patient.id, ...values })
      if (history.paciente_id !== patient.id) throw new Error('Invalid clinical history patient')
      ++requestId.current
      setState({ kind: 'ready', history })
      setEditing(false)
      setSuccess(state.kind === 'ready' ? 'Historial clínico actualizado.' : 'Historial clínico registrado.')
    } catch (error) {
      setMutationError(error instanceof ZodError
        ? 'La respuesta del servidor no permite verificar los cambios. Consulta nuevamente el historial antes de intentar guardar.'
        : historyError(error))
      if (error instanceof ZodError || (isAxiosError(error) && (error.response?.status === 404 || (state.kind === 'absent' && error.response?.status === 422)))) {
        const synced = await load()
        if (synced.kind === 'ready' && (state.kind === 'absent' || error instanceof ZodError || (isAxiosError(error) && error.response?.status === 404))) setEditing(false)
        if (synced.kind === 'absent' && state.kind === 'ready') setEditing(false)
      }
    } finally {
      mutationPending.current = false
    }
  }

  if (state.kind === 'loading') return <section aria-label="Historial clínico"><LoadingState/></section>
  if (state.kind === 'error') return <section aria-label="Historial clínico"><ErrorState description={state.message} onRetry={() => { setState({ kind: 'loading' }); void load() }}/></section>

  return (
    <section aria-labelledby="clinical-history-title" className="admin-surface rounded-[20px] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="admin-kicker">Ficha médica</p><h2 className="mt-1 text-xl font-semibold text-ink-950" id="clinical-history-title">Historial clínico</h2></div>
        {state.kind === 'ready' && canWrite && !editing ? (
          <button className="admin-secondary min-h-11 rounded-[10px] px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => { setMutationError(null); setSuccess(null); setEditing(true) }} ref={editTrigger} type="button">Editar historial</button>
        ) : null}
      </div>
      {success ? <p className="admin-success mt-5 rounded-lg p-4 text-sm" role="status">{success}</p> : null}
      {mutationError && !(state.kind === 'absent' && canWrite) && !(state.kind === 'ready' && editing) ? <p className="mt-5 text-sm text-red-700" role="alert">{mutationError}</p> : null}
      {state.kind === 'absent' ? (
        <div className="mt-6">
          <p className="admin-body">El paciente no tiene historial clínico registrado.</p>
          {canWrite ? <div className="mt-7"><h3 className="mb-5 text-lg font-semibold text-ink-950">Registrar historial clínico</h3><ClinicalHistoryForm error={mutationError} onSave={save}/></div> : null}
        </div>
      ) : editing && canWrite ? (
        <div className="mt-6"><ClinicalHistoryForm error={mutationError} initial={state.history} onCancel={() => { restoreEditFocus.current = true; setMutationError(null); setEditing(false) }} onSave={save}/></div>
      ) : (
        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          <section className="admin-tint rounded-[16px] p-5 sm:p-6"><h3 className="text-sm font-bold uppercase tracking-wide text-[#1559a2]">Información general</h3><dl className="mt-4"><div className="admin-fact"><dt className="admin-meta text-xs font-semibold uppercase tracking-wide">Sexo</dt><dd className="mt-2 break-words text-ink-950">{state.history.sexo ?? 'No registrado'}</dd></div><div className="admin-fact"><dt className="admin-meta text-xs font-semibold uppercase tracking-wide">Lugar de nacimiento</dt><dd className="mt-2 break-words text-ink-950">{state.history.lugar_nacimiento ?? 'No registrado'}</dd></div></dl></section>
          <div className="space-y-6"><section className="admin-history-block rounded-[14px] p-4 sm:p-5"><h3 className="text-sm font-bold uppercase tracking-wide text-[#1559a2]">Antecedentes de enfermedades</h3><p className="mt-3 whitespace-pre-wrap break-words leading-7 text-ink-950">{state.history.antecedentes_enfermedades ?? 'No registrado'}</p></section><div className="grid gap-4 sm:grid-cols-2"><section className="admin-history-block rounded-[14px] p-4 sm:p-5"><h3 className="text-sm font-bold uppercase tracking-wide text-[#1559a2]">Cirugías</h3><p className="mt-3 whitespace-pre-wrap break-words leading-7 text-ink-950">{state.history.cirugias ?? 'No registrado'}</p></section><section className="admin-history-block rounded-[14px] p-4 sm:p-5"><h3 className="text-sm font-bold uppercase tracking-wide text-[#1559a2]">Medicación actual</h3><p className="mt-3 whitespace-pre-wrap break-words leading-7 text-ink-950">{state.history.medicacion_actual ?? 'No registrado'}</p></section></div></div>
        </div>
      )}
    </section>
  )
}
