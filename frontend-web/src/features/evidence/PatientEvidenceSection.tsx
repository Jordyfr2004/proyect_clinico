import { isAxiosError } from 'axios'
import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { formatDate, formatFileSize } from '../../utils/displayFormat'
import type { Patient } from '../patients/patientService'
import { getPatientEvidence, type Evidence } from './evidenceService'

type EvidenceState = { kind: 'loading' } | { kind: 'ready'; records: Evidence[] } | { kind: 'error'; message: string } | { kind: 'missing' }

const evidenceTypes: Record<Evidence['tipo'], string> = { rx: 'Radiografía', caso_clinico: 'Caso clínico' }

export function PatientEvidenceSection() {
  const patient = useOutletContext<Patient>()
  const [state, setState] = useState<EvidenceState>({ kind: 'loading' })
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true
    void getPatientEvidence(patient.id).then(
      (records) => { if (active) setState({ kind: 'ready', records }) },
      (error: unknown) => { if (active) setState(isAxiosError(error) && error.response?.status === 404 ? { kind: 'missing' } : { kind: 'error', message: isAxiosError(error) && !error.response ? 'No fue posible comunicarse con el servidor.' : 'No fue posible cargar las evidencias clínicas.' }) },
    )
    return () => { active = false }
  }, [patient.id, reload])

  return <section aria-labelledby="evidence-title" className="admin-surface rounded-[20px] p-6 sm:p-8">
    <p className="admin-kicker">Expediente clínico</p><h2 className="mt-2 text-xl font-semibold text-ink-950" id="evidence-title">Evidencias clínicas</h2>
    {state.kind === 'loading' ? <LoadingState/> : state.kind === 'missing' ? <p className="admin-muted mt-5 text-sm" role="alert">Paciente no encontrado.</p> : state.kind === 'error' ? <ErrorState description={state.message} onRetry={() => { setState({ kind: 'loading' }); setReload((value) => value + 1) }}/> : state.records.length === 0 ? <div className="mt-5"><EmptyState description="No hay evidencias registradas para este paciente." icon={FileText} title="Sin evidencias clínicas"/></div> : <ul className="mt-5 grid gap-3">{state.records.map((record) => <li className="rounded-xl border border-[#dbe6f2] p-4" key={record.id}><p className="font-semibold text-ink-950">{record.nombre_archivo}</p><dl className="admin-muted mt-2 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="font-medium">Tipo</dt><dd>{evidenceTypes[record.tipo]}</dd></div><div><dt className="font-medium">Fecha</dt><dd>{formatDate(record.fecha)}</dd></div><div><dt className="font-medium">Formato</dt><dd>{record.mime_type}</dd></div><div><dt className="font-medium">Tamaño</dt><dd>{formatFileSize(record.tamano)}</dd></div>{record.descripcion ? <div className="sm:col-span-2"><dt className="font-medium">Descripción</dt><dd>{record.descripcion}</dd></div> : null}</dl></li>)}</ul>}
  </section>
}
