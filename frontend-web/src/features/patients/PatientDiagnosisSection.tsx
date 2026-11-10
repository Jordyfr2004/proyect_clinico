import { Link, useSearchParams } from 'react-router-dom'
import { IntegrationPending } from '../../components/states/IntegrationPending'
import { useAuth } from '../auth/authContext'

const topics = [
  { id: 'odontograma', label: 'Odontograma', detail: 'La estructura clínica de los datos del odontograma todavía no está definida para esta vista.' },
  { id: 'diagnostico', label: 'Diagnóstico', detail: 'Los datos clínicos se registran en cada cita médica. Esta vista del expediente espera un contrato para consultar el historial completo del paciente.' },
  { id: 'tratamientos', label: 'Tratamientos', detail: 'Los tratamientos están asociados a citas médicas. Su consulta longitudinal desde el expediente está en preparación.' },
] as const

export function PatientDiagnosisSection() {
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const selected = topics.find(({ id }) => id === params.get('apartado')) ?? topics[0]

  return <section aria-labelledby="clinical-evaluation-title" className="admin-surface rounded-[20px] p-6 sm:p-8">
    <p className="admin-kicker">Expediente clínico</p>
    <h2 className="mt-2 text-xl font-semibold text-ink-950" id="clinical-evaluation-title">Evaluación clínica</h2>
    <div aria-label="Apartados de evaluación clínica" className="mt-5 flex flex-wrap gap-2" role="group">
      {topics.map(({ id, label }) => <button aria-pressed={selected.id === id} className={`admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${selected.id === id ? 'border-clinic-600 bg-clinic-50 text-clinic-700' : ''}`} key={id} onClick={() => setParams(id === 'odontograma' ? {} : { apartado: id })} type="button">{label}</button>)}
    </div>
    <div className="mt-6 border-t border-[#e6edf6] pt-6"><h3 className="text-lg font-semibold text-ink-950">{selected.label}</h3><div className="mt-4"><IntegrationPending detail={selected.detail}/></div>
      {selected.id !== 'odontograma' && user?.role === 'doctora' ? <Link className="admin-secondary mt-5 inline-flex min-h-11 items-center rounded-[10px] px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" to="/citas-medicas">Ir a Citas médicas</Link> : null}
    </div>
  </section>
}
