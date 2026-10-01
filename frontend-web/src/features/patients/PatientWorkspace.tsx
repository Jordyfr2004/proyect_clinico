import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { ErrorState } from '../../components/states/ErrorState'
import { IntegrationPending } from '../../components/states/IntegrationPending'
import { LoadingState } from '../../components/states/LoadingState'
import { PatientFacts } from './PatientFacts'
import { getPatient, type Patient } from './patientService'
import { patientLoadError } from './patientLoadError'

const sections = [['resumen', 'Resumen'], ['historial', 'Historial'], ['diagnosticos', 'Diagnósticos'], ['tratamientos', 'Tratamientos'], ['odontograma', 'Odontograma'], ['radiografias', 'Radiografías'], ['recetas', 'Recetas'], ['planes', 'Planes / presupuestos']]
type PatientState = { kind: 'loading' } | { kind: 'ready'; patient: Patient } | { kind: 'missing' } | { kind: 'error'; message: string }

function PatientDetail({ patientId }: { patientId: string }) {
  const [state, setState] = useState<PatientState>({ kind: 'loading' })
  const load = () => {
    setState({ kind: 'loading' })
    void getPatient(patientId).then(
      (patient) => setState({ kind: 'ready', patient }),
      (error: unknown) => setState(isAxiosError(error) && error.response?.status === 404 ? { kind: 'missing' } : { kind: 'error', message: patientLoadError(error) }),
    )
  }

  useEffect(() => {
    let active = true
    void getPatient(patientId).then(
      (patient) => { if (active) setState({ kind: 'ready', patient }) },
      (error: unknown) => { if (active) setState(isAxiosError(error) && error.response?.status === 404 ? { kind: 'missing' } : { kind: 'error', message: patientLoadError(error) }) },
    )
    return () => { active = false }
  }, [patientId])

  if (state.kind === 'loading') return <LoadingState/>
  if (state.kind === 'error') return <ErrorState description={state.message} onRetry={load}/>
  if (state.kind === 'missing') return <section className="rounded-xl border border-slate-200 bg-white p-6" role="alert"><h1 className="text-xl font-semibold text-ink-950">Paciente no encontrado</h1><Link className="mt-4 inline-flex min-h-11 items-center text-clinic-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" to="/pacientes">Volver a Pacientes</Link></section>

  return (
    <div>
      <div className="border-b border-slate-200 pb-5">
        <p className="text-sm font-medium text-clinic-700">Paciente {state.patient.codigo_paciente}</p>
        <h1 className="mt-2 break-words text-2xl font-bold text-ink-950">{state.patient.nombres}</h1>
        <p className="mt-2 text-sm text-slate-600">Cédula: {state.patient.cedula}</p>
      </div>
      <nav aria-label="Secciones del expediente" className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {sections.map(([path, label]) => <NavLink className={({ isActive }) => `shrink-0 border-b-2 px-3 py-3 text-sm font-medium ${isActive ? 'border-clinic-600 text-clinic-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`} key={path} to={path}>{label}</NavLink>)}
      </nav>
      <div className="mt-6"><Outlet context={state.patient}/></div>
    </div>
  )
}

export function PatientWorkspace() {
  const { patientId } = useParams()
  if (!patientId) return <Navigate replace to="/pacientes"/>
  return <PatientDetail key={patientId} patientId={patientId}/>
}

export function PatientSection({ title }: { title: string }) {
  const patient = useOutletContext<Patient>()
  if (title === 'Resumen') return <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-semibold text-ink-950">Datos del paciente</h2><div className="mt-5"><PatientFacts patient={patient}/></div></section>
  return <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-semibold text-ink-950">{title}</h2><div className="mt-5"><IntegrationPending detail={title === 'Odontograma' ? 'El odontograma se habilitará cuando pueda verificarse la numeración y estructura clínica definida por la base de datos.' : `La información de ${title.toLowerCase()} se cargará desde los servicios reales del backend.`}/></div></section>
}
