import { isAxiosError } from 'axios'
import { FileText, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { Button } from '../../components/ui/Button'
import { formatDate, formatFileSize } from '../../utils/displayFormat'
import { requestError } from '../../utils/requestError'
import { useAuth } from '../auth/authContext'
import type { Patient } from '../patients/patientService'
import { deleteEvidence, EVIDENCE_ACCEPT, EVIDENCE_MAX_BYTES, getEvidenceFile, getPatientEvidence, uploadPatientEvidence, type Evidence, type EvidenceType } from './evidenceService'

type EvidenceState = { kind: 'loading' } | { kind: 'ready'; records: Evidence[] } | { kind: 'error'; message: string } | { kind: 'missing' }

const evidenceTypes: Record<EvidenceType, string> = { rx: 'Radiografía', caso_clinico: 'Caso clínico', documento: 'Documento' }
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

function uploadedBy(record: Evidence): string | null {
  if (!record.subido_por) return null
  return record.subido_por.role === 'paciente' ? 'Paciente (app móvil)' : record.subido_por.name
}

function EvidenceUploadForm({ patientId, onUploaded }: { patientId: string; onUploaded: (record: Evidence) => void }) {
  const [tipo, setTipo] = useState<EvidenceType>('rx')
  const [descripcion, setDescripcion] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (!file) { setError('Selecciona un archivo.'); return }
    if (!allowedMimeTypes.has(file.type) || file.size > EVIDENCE_MAX_BYTES) { setError('Selecciona una imagen JPG, PNG, WebP o un PDF de hasta 20 MB.'); return }
    setBusy(true); setError(null)
    try {
      onUploaded(await uploadPatientEvidence(patientId, { tipo, archivo: file, descripcion }))
      setFile(null); setDescripcion('')
      if (fileInput.current) fileInput.current.value = ''
    } catch (cause) { setError(requestError(cause, 'No fue posible subir el archivo.')) }
    finally { setBusy(false) }
  }

  return <form aria-label="Subir evidencia clínica" className="mt-5 grid gap-4 rounded-xl border border-dashed border-[#bcd3ea] p-4 sm:grid-cols-[180px_1fr]" onSubmit={(event) => { void submit(event) }}>
    <label className="block text-sm font-medium text-slate-700" htmlFor="evidence-type">Tipo<select className="mt-2 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px]" disabled={busy} id="evidence-type" onChange={(event) => setTipo(event.target.value as EvidenceType)} value={tipo}>{Object.entries(evidenceTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="block text-sm font-medium text-slate-700" htmlFor="evidence-file">Archivo (JPG, PNG, WebP o PDF, hasta 20 MB)<input accept={EVIDENCE_ACCEPT} className="mt-2 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-clinic-50 file:px-4 file:font-semibold file:text-clinic-700" disabled={busy} id="evidence-file" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(null) }} ref={fileInput} type="file"/></label>
    <label className="block text-sm font-medium text-slate-700 sm:col-span-2" htmlFor="evidence-description">Descripción (opcional)<input className="mt-2 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px]" disabled={busy} id="evidence-description" maxLength={1000} onChange={(event) => setDescripcion(event.target.value)} value={descripcion}/></label>
    {error ? <p className="text-sm text-red-600 sm:col-span-2" role="alert">{error}</p> : null}
    <div className="sm:col-span-2"><Button disabled={busy} type="submit"><Upload aria-hidden="true" size={16}/>{busy ? 'Subiendo…' : 'Subir al expediente'}</Button></div>
  </form>
}

export function PatientEvidenceSection() {
  const patient = useOutletContext<Patient>()
  const { user } = useAuth()
  const canWrite = user?.role === 'doctora'
  const [state, setState] = useState<EvidenceState>({ kind: 'loading' })
  const [reload, setReload] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)
  const [opening, setOpening] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Evidence | null>(null)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    let active = true
    void getPatientEvidence(patient.id).then(
      (records) => { if (active) setState({ kind: 'ready', records }) },
      (error: unknown) => { if (active) setState(isAxiosError(error) && error.response?.status === 404 ? { kind: 'missing' } : { kind: 'error', message: isAxiosError(error) && !error.response ? 'No fue posible comunicarse con el servidor.' : 'No fue posible cargar las evidencias clínicas.' }) },
    )
    return () => { active = false }
  }, [patient.id, reload])

  const open = async (record: Evidence) => {
    if (opening) return
    // La ventana se abre antes de la descarga para que el navegador no la bloquee.
    const viewer = window.open('', '_blank')
    setOpening(record.id); setActionError(null)
    try {
      const url = URL.createObjectURL(await getEvidenceFile(record.id))
      if (viewer) viewer.location.href = url
      else window.location.assign(url)
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (cause) {
      viewer?.close()
      setActionError(requestError(cause, 'No fue posible abrir el archivo.'))
    } finally { setOpening(null) }
  }

  const remove = async () => {
    if (!confirmDelete || deleting) return
    setDeleting(true); setActionError(null)
    try {
      await deleteEvidence(confirmDelete.id)
      setState((current) => current.kind === 'ready' ? { kind: 'ready', records: current.records.filter((record) => record.id !== confirmDelete.id) } : current)
      setConfirmDelete(null)
    } catch (cause) {
      setConfirmDelete(null)
      setActionError(requestError(cause, 'No fue posible eliminar la evidencia.'))
    } finally { setDeleting(false) }
  }

  return <section aria-labelledby="evidence-title" className="admin-surface rounded-[20px] p-6 sm:p-8">
    <p className="admin-kicker">Expediente clínico</p><h2 className="mt-2 text-xl font-semibold text-ink-950" id="evidence-title">Evidencias clínicas</h2>
    {canWrite && state.kind === 'ready' ? <EvidenceUploadForm onUploaded={(record) => setState((current) => current.kind === 'ready' ? { kind: 'ready', records: [record, ...current.records] } : current)} patientId={patient.id}/> : null}
    {actionError ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{actionError}</p> : null}
    {confirmDelete ? <AccessibleDialog busy={deleting} compact onClose={() => setConfirmDelete(null)} title="Eliminar evidencia" titleId="delete-evidence-title"><p className="text-sm text-slate-700">Se eliminará <strong>{confirmDelete.nombre_archivo}</strong> del expediente y del servidor de archivos. Esta acción no se puede deshacer.</p><div className="mt-5 flex flex-wrap justify-end gap-2"><Button disabled={deleting} onClick={() => setConfirmDelete(null)} type="button" variant="secondary">Cancelar</Button><Button className="bg-red-600 hover:bg-red-700" disabled={deleting} onClick={() => { void remove() }} type="button">{deleting ? 'Eliminando…' : 'Eliminar'}</Button></div></AccessibleDialog> : null}
    {state.kind === 'loading' ? <LoadingState/> : state.kind === 'missing' ? <p className="admin-muted mt-5 text-sm" role="alert">Paciente no encontrado.</p> : state.kind === 'error' ? <ErrorState description={state.message} onRetry={() => { setState({ kind: 'loading' }); setReload((value) => value + 1) }}/> : state.records.length === 0 ? <div className="mt-5"><EmptyState description="No hay evidencias registradas para este paciente." icon={FileText} title="Sin evidencias clínicas"/></div> : <ul className="mt-5 grid gap-3">{state.records.map((record) => <li className="rounded-xl border border-[#dbe6f2] p-4" key={record.id}><div className="flex flex-wrap items-start justify-between gap-3"><p className="min-w-0 break-words font-semibold text-ink-950">{record.nombre_archivo}</p><div className="flex flex-wrap gap-2"><Button aria-label={`Ver ${record.nombre_archivo}`} disabled={opening === record.id} onClick={() => { void open(record) }} type="button" variant="secondary">{opening === record.id ? 'Abriendo…' : 'Ver archivo'}</Button>{canWrite ? <Button aria-label={`Eliminar ${record.nombre_archivo}`} onClick={() => setConfirmDelete(record)} type="button" variant="ghost">Eliminar</Button> : null}</div></div><dl className="admin-muted mt-2 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="font-medium">Tipo</dt><dd>{evidenceTypes[record.tipo]}</dd></div><div><dt className="font-medium">Fecha</dt><dd>{formatDate(record.fecha)}</dd></div><div><dt className="font-medium">Formato</dt><dd>{record.mime_type}</dd></div><div><dt className="font-medium">Tamaño</dt><dd>{formatFileSize(record.tamano)}</dd></div>{uploadedBy(record) ? <div><dt className="font-medium">Subido por</dt><dd>{uploadedBy(record)}</dd></div> : null}{record.descripcion ? <div className="sm:col-span-2"><dt className="font-medium">Descripción</dt><dd>{record.descripcion}</dd></div> : null}</dl></li>)}</ul>}
  </section>
}
