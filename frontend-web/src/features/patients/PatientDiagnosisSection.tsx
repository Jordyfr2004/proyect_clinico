import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { apiClient } from '../../services/apiClient'
import { useClinicalQuery } from '../../services/clinicalQuery'
import { formatDate } from '../../utils/displayFormat'
import { useAuth } from '../auth/authContext'
import { OdontogramPreview } from './OdontogramPreview'
import type { Patient } from './patientService'
const topics = [{ id: 'odontograma', label: 'Odontograma' }, { id: 'diagnostico', label: 'Diagnóstico' }, { id: 'tratamientos', label: 'Tratamientos' }] as const
const clinicalAppointmentSchema = z.object({
 id: z.string().min(1), paciente_id: z.string().nullable(), tipo: z.enum(['personal','cita_medica']),
 fecha: z.string().nullable(), diagnostico: z.string().nullable(), tratamiento: z.string().nullable(), observacion: z.string().nullable(),
})
async function getPatientClinicalAppointments(patientId: string, signal: AbortSignal) {
 z.uuid().parse(patientId)
 if (!apiClient.defaults.baseURL) throw new Error('API no configurada')
 const { data } = await apiClient.get<unknown>('/agenda', { params: { tipo: 'cita_medica' }, signal })
 return z.object({ data: z.array(clinicalAppointmentSchema) }).parse(data).data
  .filter((record) => record.tipo === 'cita_medica' && record.paciente_id === patientId)
  .sort((a,b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
}
function ClinicalAppointments({ patientId, treatment }: { patientId: string; treatment: boolean }) {
 const { user } = useAuth()
 const doctor = user?.role === 'doctora'
 const query = useClinicalQuery(['agenda','patient-clinical-appointments',patientId], (signal) => getPatientClinicalAppointments(patientId,signal), { enabled: doctor })
 if (!doctor) return <p role="status" className="admin-muted mt-4 text-sm">La consulta de diagnósticos y tratamientos está disponible para la doctora desde las citas médicas.</p>
 if (query.isError) return <ErrorState description="No fue posible consultar los datos clínicos de las citas médicas." onRetry={() => { void query.refetch() }}/>
 if (!query.data) return <LoadingState/>
 const records = query.data.filter((record) => Boolean((treatment ? record.tratamiento : record.diagnostico)?.trim()))
 return <div className="mt-4 space-y-4"><p className="admin-muted text-sm">Datos clínicos registrados en las citas médicas de este paciente.</p>{records.length ? <ul className="grid gap-3">{records.map((record) => <li className="admin-history-block rounded-xl p-4" key={record.id}><p className="admin-muted text-xs font-semibold">{record.fecha ? formatDate(record.fecha) : 'Fecha no registrada'}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink-950">{treatment ? record.tratamiento : record.diagnostico}</p>{record.observacion ? <p className="admin-muted mt-2 whitespace-pre-wrap break-words text-sm">Observación: {record.observacion}</p> : null}<Link className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-clinic-700 underline" to="/citas-medicas">Ver cita médica</Link></li>)}</ul> : <p role="status" className="admin-muted text-sm">No hay {treatment ? 'tratamientos' : 'diagnósticos'} registrados en las citas médicas de este paciente.</p>}</div>
}
export function PatientDiagnosisSection() {
 const [params,setParams] = useSearchParams()
 const patient = useOutletContext<Patient>()
 const { user } = useAuth()
 const selected = topics.find(({id}) => id === params.get('apartado')) ?? topics[0]
 return <section aria-labelledby="clinical-evaluation-title" className="admin-surface rounded-[20px] p-6 sm:p-8"><p className="admin-kicker">Expediente clínico</p><h2 className="mt-2 text-xl font-semibold text-ink-950" id="clinical-evaluation-title">Evaluación clínica</h2><div aria-label="Apartados de evaluación clínica" className="mt-5 flex flex-wrap gap-2" role="group">{topics.map(({id,label}) => <button aria-pressed={selected.id===id} data-clinical-navigation className={`admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${selected.id===id ? 'border-clinic-600 bg-clinic-50 text-clinic-700' : ''}`} key={id} onClick={() => setParams(id==='odontograma' ? {} : { apartado:id })} type="button">{label}</button>)}</div><div className="mt-6 border-t border-[#e6edf6] pt-6">{selected.id==='odontograma' ? <OdontogramPreview key={patient.id}/> : <><h3 className="text-lg font-semibold text-ink-950">{selected.label}</h3><ClinicalAppointments key={`${patient.id}-${selected.id}`} patientId={patient.id} treatment={selected.id==='tratamientos'}/>{user?.role==='doctora' ? <Link className="admin-secondary mt-5 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold" to="/citas-medicas">Ir a Citas médicas</Link> : null}</>}</div></section>
}
