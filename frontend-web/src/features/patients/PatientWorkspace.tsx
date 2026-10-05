import { isAxiosError } from 'axios'
import { ArrowLeft, FileText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { ZodError } from 'zod'
import { ErrorState } from '../../components/states/ErrorState'
import { IntegrationPending } from '../../components/states/IntegrationPending'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { useAuth } from '../auth/authContext'
import { PatientEditForm } from './PatientEditForm'
import { PatientFacts } from './PatientFacts'
import { getPatient, updatePatient, type Patient, type UpdatePatientPayload } from './patientService'
import { patientLoadError } from './patientLoadError'

const sections = [['resumen', 'Resumen'], ['historial', 'Historial'], ['diagnosticos', 'Diagnósticos'], ['tratamientos', 'Tratamientos'], ['odontograma', 'Odontograma'], ['radiografias', 'Evidencias clínicas'], ['recetas', 'Recetas'], ['planes', 'Planes / presupuestos']]
type PatientState = { kind: 'loading' } | { kind: 'ready'; patient: Patient } | { kind: 'missing' } | { kind: 'error'; message: string }

function PatientDetail({ patientId }: { patientId: string }) {
  const { user } = useAuth()
  const [state, setState] = useState<PatientState>({ kind: 'loading' })
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editBusy, setEditBusy] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const editPending = useRef(false)
  const editTrigger = useRef<HTMLButtonElement>(null)
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

  const closeEdit = () => {
    if (editPending.current) return
    setEditing(false)
    setEditError(null)
    editTrigger.current?.focus()
  }

  const saveEdit = async (values: UpdatePatientPayload): Promise<boolean> => {
    if (editPending.current) return false
    editPending.current = true
    setEditBusy(true)
    setEditError(null)
    setSuccess(null)
    try {
      await updatePatient(patientId, values)
      const refreshed = await getPatient(patientId)
      setState({ kind: 'ready', patient: refreshed })
      setSuccess('Paciente actualizado correctamente.')
      setEditing(false)
      editTrigger.current?.focus()
      return true
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        setEditing(false)
        load()
      } else if (isAxiosError(error) && error.response?.status === 422) {
        const message = (error.response.data as { message?: unknown } | undefined)?.message
        setEditError(typeof message === 'string' && message.trim() ? message : 'Revisa los datos del paciente.')
      } else if (error instanceof ZodError) {
        setEditError('La respuesta del servidor no permite verificar la actualización. Vuelve a consultar el expediente.')
      } else {
        setEditError(patientLoadError(error))
      }
      return false
    } finally {
      editPending.current = false
      setEditBusy(false)
    }
  }

  if (state.kind === 'loading') return <LoadingState/>
  if (state.kind === 'error') return <ErrorState description={state.message} onRetry={load}/>
  if (state.kind === 'missing') return <section className="admin-surface rounded-xl p-6" role="alert"><h1 className="text-xl font-semibold text-ink-950">Paciente no encontrado</h1><Link className="mt-4 inline-flex min-h-11 items-center text-clinic-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" to="/pacientes">Volver a Pacientes</Link></section>

  return (
    <div className="admin-reveal min-w-0 max-w-[1330px]">
      <Link className="mb-5 inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-clinic-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2" to="/pacientes"><ArrowLeft aria-hidden="true" size={16}/>Pacientes</Link>
      {success ? <p className="admin-success mb-5 rounded-xl p-4 text-sm" role="status">{success}</p> : null}
      {editing ? <AccessibleDialog busy={editBusy} onClose={closeEdit} title="Editar datos del paciente" titleId="edit-patient-title"><PatientEditForm error={editError} onCancel={closeEdit} onSave={saveEdit} patient={state.patient}/></AccessibleDialog> : null}
      <div className="admin-surface-raised overflow-hidden rounded-[22px]">
        <div className="admin-record-hero p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
            <span aria-hidden="true" className="admin-record-avatar grid size-14 shrink-0 place-items-center rounded-[16px] text-xl font-bold sm:size-[74px] sm:rounded-[18px] sm:text-2xl">{state.patient.nombres.trim().charAt(0).toLocaleUpperCase('es')}</span>
            <div className="min-w-[170px] flex-1"><p className="admin-kicker">Expediente clínico</p><h1 className="mt-1 break-words text-[22px] font-bold tracking-tight text-white sm:text-[32px]">{state.patient.nombres}</h1><p className="mt-2 break-words text-sm text-sky-100/80">Código {state.patient.codigo_paciente}</p></div>
            <div className="flex flex-wrap items-center gap-2"><span className="admin-record-badge rounded-full px-3 py-1.5 text-xs font-semibold"><FileText aria-hidden="true" className="mr-1 inline" size={14}/>Expediente</span>{user?.role === 'doctora' || user?.role === 'asistente' ? <button className="min-h-11 rounded-[10px] border border-sky-200/50 px-4 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" onClick={() => { setEditError(null); setSuccess(null); setEditing(true) }} ref={editTrigger} type="button">Editar datos</button> : null}</div>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-sky-200/20 pt-5 lg:grid-cols-3">
            <div><dt className="text-[11px] font-bold uppercase tracking-wider text-sky-200/75">Cédula</dt><dd className="mt-1 break-words text-sm font-semibold text-white">{state.patient.cedula}</dd></div>
            <div><dt className="text-[11px] font-bold uppercase tracking-wider text-sky-200/75">Teléfono</dt><dd className="mt-1 break-words text-sm font-semibold text-white">{state.patient.telefono ?? 'No registrado'}</dd></div>
            <div><dt className="text-[11px] font-bold uppercase tracking-wider text-sky-200/75">Dirección</dt><dd className="mt-1 break-words text-sm font-semibold text-white">{state.patient.direccion ?? 'No registrada'}</dd></div>
          </dl>
        </div>
        <nav aria-label="Secciones del expediente" className="flex min-w-0 gap-1 overflow-x-auto bg-white px-3 sm:px-6">
          {sections.map(([path, label]) => <NavLink className="admin-tab shrink-0 px-3 py-4 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-3px]" key={path} to={path}>{label}</NavLink>)}
        </nav>
      </div>
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
  if (title === 'Resumen') return <section className="admin-surface rounded-[20px] p-6 sm:p-8"><p className="admin-kicker">Información registrada</p><h2 className="mt-2 text-xl font-semibold text-ink-950">Datos del paciente</h2><div className="mt-5"><PatientFacts patient={patient}/></div></section>
  return <section className="admin-surface rounded-[20px] p-6 sm:p-8"><span className="admin-pill admin-pill-pending">En preparación</span><h2 className="mt-4 text-xl font-semibold text-ink-950">{title}</h2><div className="mt-5"><IntegrationPending detail={title === 'Odontograma' ? 'El odontograma se habilitará cuando pueda verificarse la numeración y estructura clínica definida por la base de datos.' : `La información de ${title.toLowerCase()} se cargará desde los servicios reales del backend.`}/></div></section>
}
