import { ArrowUpRight, Plus, Search, UsersRound } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ZodError } from 'zod'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { createPatient, getPatients, type CreatePatientPayload, type PatientPage } from './patientService'
import { patientLoadError } from './patientLoadError'
import { PatientCreateForm } from './PatientCreateForm'
import { ProtectedPhoto } from '../auth/ProtectedPhoto'
import { invalidateClinicalQueries, markClinicalQueriesStale, useClinicalQuery } from '../../services/clinicalQuery'
import { useClinicalViewState } from '../../services/clinicalViewState'

type PatientsState = { kind: 'loading' } | { kind: 'ready'; page: PatientPage } | { kind: 'error'; message: string }

export function PatientsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useClinicalViewState('patients.search', () => '')
  const [page, setPage] = useClinicalViewState('patients.page', () => 1)
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim())
  const submitPending = useRef(false)
  const createTrigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])
  const query = useClinicalQuery(['patients', debouncedSearch, page], (signal) => getPatients({ ...(debouncedSearch ? { buscar: debouncedSearch } : {}), page }, signal))
  const state: PatientsState = search.trim() !== debouncedSearch ? { kind: 'loading' }
    : query.data ? { kind: 'ready', page: query.data }
      : query.isError ? { kind: 'error', message: patientLoadError(query.error) } : { kind: 'loading' }
  const load = () => { void query.refetch() }

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
      setSearch('')
      setPage(1)
      void markClinicalQueriesStale(['patients'])
      void invalidateClinicalQueries(['patients', '', 1])
      void markClinicalQueriesStale(['dashboard-report'])
      void markClinicalQueriesStale(['reports'])
      return true
    } catch (error) {
      if (error instanceof ZodError) {
        setCreateError('La respuesta del servidor no permite verificar el registro. Revisa el listado antes de intentarlo de nuevo.')
        void invalidateClinicalQueries(['patients'])
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
      <div className="mb-5 w-full sm:max-w-[360px]"><label className="admin-meta text-xs font-semibold" htmlFor="patient-search">Buscar pacientes</label><div className="relative mt-1"><Search aria-hidden="true" className="admin-meta pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={17}/><input className="admin-input admin-search-input w-full text-sm focus-visible:outline-2 focus-visible:outline-offset-2" id="patient-search" maxLength={255} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Nombre, cédula o código" type="search" value={search}/></div></div>
      {query.isFetching && state.kind === 'ready' ? <p className="admin-muted mb-3 text-sm" role="status">Actualizando pacientes…</p> : null}
      {query.isError && state.kind === 'ready' ? <p className="mb-3 text-sm text-red-700" role="alert">{patientLoadError(query.error)} <button className="dashboard-retry" onClick={load} type="button">Reintentar</button></p> : null}
      {state.kind === 'loading' ? <div className="mt-6"><LoadingState/></div> : null}
      {state.kind === 'error' ? <div className="mt-6"><ErrorState description={state.message} onRetry={load}/></div> : null}
      {state.kind === 'ready' && state.page.data.length === 0 ? (
        <section className="mt-6"><EmptyState description={search.trim() ? 'Prueba con otro nombre, cédula o código de paciente.' : 'El backend no devolvió pacientes registrados.'} icon={UsersRound} title={search.trim() ? 'Ningún paciente coincide con la búsqueda.' : 'No hay pacientes registrados.'}/></section>
      ) : null}
      {state.kind === 'ready' && state.page.data.length > 0 ? (
        <div className="admin-surface admin-directory overflow-hidden rounded-[20px]">
          <div className="admin-directory-head flex flex-col gap-4 border-b px-5 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-7">
            <div><h2 className="text-lg font-bold text-ink-950">Directorio de pacientes</h2><p className="admin-muted mt-1 text-sm">{state.page.total} pacientes encontrados en el sistema.</p></div>
          </div>
            <section aria-label="Pacientes registrados">
              <div aria-hidden="true" className="admin-directory-labels hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_24px] gap-4 border-b px-7 py-3 text-[11px] font-bold uppercase tracking-[0.1em] md:grid"><span>Paciente</span><span>Código</span><span>Cédula</span><span/></div>
              {state.page.data.map((patient) => (
                <Link className="admin-patient-row flex min-w-0 items-center gap-4 border-b border-[#e6edf6] px-5 py-4 last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-[-3px] sm:px-7 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_24px]" key={patient.id} to={`/pacientes/${encodeURIComponent(patient.id)}/historial`}>
                  <span className="flex min-w-0 flex-1 items-center gap-3 md:flex-auto"><ProtectedPhoto deferUntilVisible className="size-10 rounded-[12px] text-sm" name={patient.nombres} photoUrl={patient.foto_perfil_url}/><span className="min-w-0"><span className="block break-words text-sm font-semibold text-ink-950">{patient.nombres}</span><span className="admin-meta mt-0.5 block break-words text-xs md:hidden">Cédula: {patient.cedula}</span><span className="admin-meta mt-0.5 block break-words text-xs md:hidden">Código {patient.codigo_paciente}</span></span></span>
                  <span className="admin-muted hidden break-words text-sm md:block">{patient.codigo_paciente}</span><span className="admin-muted hidden break-words text-sm md:block">{patient.cedula}</span><ArrowUpRight aria-hidden="true" className="shrink-0 text-clinic-600" size={18}/>
                </Link>
              ))}
            </section>
          <nav aria-label="Páginas de pacientes" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6edf6] px-5 py-4 sm:px-7"><span className="admin-muted text-sm">Página {state.page.current_page} de {state.page.last_page}</span><div className="flex gap-2"><button className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-50" disabled={!state.page.prev_page_url} onClick={() => { setPage(state.page.current_page - 1) }} type="button">Anterior</button><button className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-50" disabled={!state.page.next_page_url} onClick={() => { setPage(state.page.current_page + 1) }} type="button">Siguiente</button></div></nav>
        </div>
      ) : null}
    </div>
  )
}
