import { ArrowUpRight, Plus, Search, UsersRound } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ZodError } from 'zod'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { createPatient, getPatients, type CreatePatientPayload, type Patient } from './patientService'
import { patientLoadError } from './patientLoadError'
import { PatientCreateForm } from './PatientCreateForm'

type PatientsState = { kind: 'loading' } | { kind: 'ready'; patients: Patient[] } | { kind: 'error'; message: string }

export function PatientsPage() {
  const [state, setState] = useState<PatientsState>({ kind: 'loading' })
  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
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
    if (submitPending.current) return
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
      submitPending.current = false
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

  const query = search.trim().toLocaleLowerCase('es')
  const matchingPatients = state.kind === 'ready'
    ? state.patients.filter((patient) => [patient.nombres, patient.cedula, patient.codigo_paciente].some((value) => value.toLocaleLowerCase('es').includes(query)))
    : []

  return (
    <div className="admin-reveal max-w-[1330px]">
      <div className="flex flex-col gap-5 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="admin-kicker">Registro clínico</p>
          <h1 className="admin-page-title mt-2">Pacientes</h1>
          <p className="admin-body mt-2 max-w-2xl">Consulta los pacientes registrados en el sistema.</p>
        </div>
        <button aria-controls={createOpen ? 'patient-create-panel' : undefined} aria-expanded={createOpen} className="admin-primary inline-flex min-h-11 w-fit shrink-0 items-center gap-2 rounded-[10px] px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => { if (submitPending.current) return; if (createOpen) closeCreate(); else { setSuccess(null); setCreateOpen(true) } }} ref={createTrigger} type="button"><Plus aria-hidden="true" size={18}/>Registrar paciente</button>
      </div>
      {success ? <p className="admin-state admin-success mb-6 rounded-xl p-4 text-sm" role="status">{success}</p> : null}
      {createOpen ? <AccessibleDialog onClose={closeCreate} title="Registrar paciente" titleId="create-patient-title"><PatientCreateForm error={createError} onCancel={closeCreate} onCreate={onCreate}/></AccessibleDialog> : null}
      {state.kind === 'loading' ? <div className="mt-6"><LoadingState/></div> : null}
      {state.kind === 'error' ? <div className="mt-6"><ErrorState description={state.message} onRetry={load}/></div> : null}
      {state.kind === 'ready' && state.patients.length === 0 ? (
        <section className="mt-6"><EmptyState description="El backend no devolvió pacientes registrados." icon={UsersRound} title="No hay pacientes registrados."/></section>
      ) : null}
      {state.kind === 'ready' && state.patients.length > 0 ? (
        <div className="admin-surface admin-directory overflow-hidden rounded-[20px]">
          <div className="admin-directory-head flex flex-col gap-4 border-b px-5 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-7">
            <div><h2 className="text-lg font-bold text-ink-950">Directorio de pacientes</h2><p className="admin-muted mt-1 text-sm">Datos recibidos del sistema.</p></div>
            <div className="w-full sm:max-w-[330px]"><label className="admin-meta text-xs font-semibold" htmlFor="patient-search">Buscar pacientes</label><div className="relative mt-1"><Search aria-hidden="true" className="admin-meta pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={17}/><input className="admin-input admin-search-input w-full text-sm focus-visible:outline-2 focus-visible:outline-offset-2" id="patient-search" onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, cédula o código" type="search" value={search}/></div></div>
          </div>
          {matchingPatients.length === 0 ? (
            <section><EmptyState description="Prueba con otro nombre, cédula o código de paciente." icon={UsersRound} title="Ningún paciente coincide con la búsqueda."/></section>
          ) : (
            <section aria-label="Pacientes registrados">
              <div aria-hidden="true" className="admin-directory-labels hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_24px] gap-4 border-b px-7 py-3 text-[11px] font-bold uppercase tracking-[0.1em] md:grid"><span>Paciente</span><span>Código</span><span>Cédula</span><span/></div>
              {matchingPatients.map((patient) => (
                <Link className="admin-patient-row flex min-w-0 items-center gap-4 border-b border-[#e6edf6] px-5 py-4 last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-[-3px] sm:px-7 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_24px]" key={patient.id} to={`/pacientes/${encodeURIComponent(patient.id)}/resumen`}>
                  <span className="flex min-w-0 flex-1 items-center gap-3 md:flex-auto"><span aria-hidden="true" className="admin-avatar size-10 rounded-[12px] text-sm">{patient.nombres.trim().charAt(0).toLocaleUpperCase('es')}</span><span className="min-w-0"><span className="block break-words text-sm font-semibold text-ink-950">{patient.nombres}</span><span className="admin-meta mt-0.5 block break-words text-xs md:hidden">Cédula: {patient.cedula}</span><span className="admin-meta mt-0.5 block break-words text-xs md:hidden">Código {patient.codigo_paciente}</span></span></span>
                  <span className="admin-muted hidden break-words text-sm md:block">{patient.codigo_paciente}</span><span className="admin-muted hidden break-words text-sm md:block">{patient.cedula}</span><ArrowUpRight aria-hidden="true" className="shrink-0 text-clinic-600" size={18}/>
                </Link>
              ))}
            </section>
          )}
        </div>
      ) : null}
    </div>
  )
}
