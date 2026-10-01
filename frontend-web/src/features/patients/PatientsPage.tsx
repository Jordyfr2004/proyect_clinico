import { UsersRound } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ZodError } from 'zod'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { createPatient, getPatients, type CreatePatientPayload, type Patient } from './patientService'
import { patientLoadError } from './patientLoadError'
import { PatientCreateForm } from './PatientCreateForm'

type PatientsState = { kind: 'loading' } | { kind: 'ready'; patients: Patient[] } | { kind: 'error'; message: string }

export function PatientsPage() {
  const [state, setState] = useState<PatientsState>({ kind: 'loading' })
  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const requestId = useRef(0)
  const submitPending = useRef(false)
  const createTrigger = useRef<HTMLButtonElement>(null)

  const fetchPatients = useCallback(() => {
    const id = ++requestId.current
    return getPatients().then(
      (patients) => { if (id === requestId.current) setState({ kind: 'ready', patients }) },
      (error: unknown) => { if (id === requestId.current) setState({ kind: 'error', message: patientLoadError(error) }) },
    )
  }, [])

  const load = () => {
    setState({ kind: 'loading' })
    void fetchPatients()
  }

  useEffect(() => {
    const requests = requestId
    void fetchPatients()
    return () => { requests.current++ }
  }, [fetchPatients])

  const closeCreate = () => {
    setCreateOpen(false)
    setCreateError(null)
    createTrigger.current?.focus()
  }

  const onCreate = async (values: CreatePatientPayload): Promise<boolean> => {
    if (submitPending.current) return false
    submitPending.current = true
    setCreateError(null)
    setSuccess(null)
    try {
      const result = await createPatient(values)
      setSuccess(result.message)
      closeCreate()
      load()
      return true
    } catch (error) {
      if (error instanceof ZodError) {
        setCreateError('La respuesta del servidor no permite verificar el registro. Revisa el listado antes de intentarlo de nuevo.')
        load()
      } else if (isAxiosError(error) && !error.response) {
        setCreateError('No fue posible comunicarse con el servidor. Inténtalo de nuevo.')
      } else if (isAxiosError(error) && error.response?.status === 422) {
        const message = (error.response.data as { message?: unknown } | undefined)?.message
        setCreateError(typeof message === 'string' && message.trim() ? message : 'Revisa los datos del paciente.')
      } else if (isAxiosError(error) && error.response) {
        setCreateError(`El servidor respondió con HTTP ${error.response.status}. No se pudo registrar el paciente.`)
      } else {
        setCreateError('No fue posible verificar el registro del paciente.')
      }
      return false
    } finally {
      submitPending.current = false
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-[2rem]">Pacientes</h1>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600">Consulta los pacientes registrados en el sistema.</p>
        </div>
        <button aria-controls={createOpen ? 'patient-create-panel' : undefined} aria-expanded={createOpen} className="min-h-11 w-fit shrink-0 rounded-lg bg-clinic-700 px-4 text-sm font-semibold text-white hover:bg-clinic-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" onClick={() => { if (submitPending.current) return; if (createOpen) closeCreate(); else { setSuccess(null); setCreateOpen(true) } }} ref={createTrigger} type="button">Registrar paciente</button>
      </div>
      {success ? <p className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900" role="status">{success}</p> : null}
      {createOpen ? <PatientCreateForm error={createError} onCancel={closeCreate} onCreate={onCreate}/> : null}
      {state.kind === 'loading' ? <div className="mt-6"><LoadingState/></div> : null}
      {state.kind === 'error' ? <div className="mt-6 rounded-2xl border border-slate-200 bg-white"><ErrorState description={state.message} onRetry={load}/></div> : null}
      {state.kind === 'ready' && state.patients.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white"><EmptyState description="El backend no devolvió pacientes registrados." icon={UsersRound} title="No hay pacientes registrados."/></section>
      ) : null}
      {state.kind === 'ready' && state.patients.length > 0 ? (
        <section aria-label="Pacientes registrados" className="mt-6 grid gap-4 sm:grid-cols-2">
          {state.patients.map((patient) => (
            <Link className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-clinic-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" key={patient.id} to={`/pacientes/${encodeURIComponent(patient.id)}/resumen`}>
              <p className="text-sm font-medium text-clinic-700">Código {patient.codigo_paciente}</p>
              <h2 className="mt-2 break-words text-lg font-semibold text-ink-950">{patient.nombres}</h2>
              <p className="mt-1 break-words text-sm text-slate-600">Cédula: {patient.cedula}</p>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  )
}
