import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { ZodError } from 'zod'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { formatDate } from '../../utils/displayFormat'
import { getAppointmentSummary, type AppointmentSummary as Summary } from './agendaService'

type SummaryState =
  | { kind: 'loading' }
  | { kind: 'success'; id: string; summary: Summary }
  | { kind: 'empty'; id: string }
  | { kind: 'error'; id: string; message: string }

function summaryError(error: unknown): string {
  if (error instanceof ZodError) return 'El servicio de resumen no está disponible: la respuesta no cumple el contrato esperado.'
  if (isAxiosError(error)) {
    const status = error.response?.status
    if (status === 401) return 'Tu sesión no permite consultar el resumen. Vuelve a iniciar sesión si se te solicita.'
    if (status === 403) return 'No tienes permisos para consultar este resumen.'
    if (status === 404) return 'No se encontró el resumen de esta cita o el servicio aún no está disponible.'
    if (status === 502 || status === 503) return 'El servicio de resumen no está disponible en este momento.'
    if (!error.response) return 'No fue posible conectar con el servicio de resumen. Comprueba tu conexión.'
    return 'El servidor devolvió un error del servidor al consultar el resumen.'
  }
  return 'El servicio de resumen no está disponible en este momento.'
}

export function AppointmentSummary({ id }: { id: string }) {
  const academicEnabled = import.meta.env.VITE_ENABLE_ACADEMIC_ORCHESTRATION === 'true'
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<SummaryState>({ kind: 'loading' })

  useEffect(() => {
    if (!academicEnabled) return
    const controller = new AbortController()
    getAppointmentSummary(id, controller.signal).then(
      (summary) => { if (!controller.signal.aborted) setState(summary ? { kind: 'success', id, summary } : { kind: 'empty', id }) },
      (error: unknown) => { if (!controller.signal.aborted) setState({ kind: 'error', id, message: summaryError(error) }) },
    )
    return () => controller.abort()
  }, [id, attempt, academicEnabled])

  if (!academicEnabled) return <p className="admin-muted text-sm" role="status">La orquestación académica está deshabilitada.</p>
  if (state.kind === 'loading' || state.id !== id) return <LoadingState label="Cargando resumen de cita…"/>
  if (state.kind === 'empty') return <p className="admin-muted text-sm" role="status">No hay información de resumen para esta cita.</p>
  if (state.kind === 'error') return <ErrorState description={state.message} onRetry={() => { setState({ kind: 'loading' }); setAttempt((value) => value + 1) }}/>

  const { cita, paciente } = state.summary
  return <div className="space-y-5 text-sm">
    <section aria-label="Datos de la cita" className="rounded-xl border border-[#dbe6f2] p-4">
      <h3 className="mb-3 font-bold text-ink-950">Cita</h3>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div><dt className="admin-muted">Fecha</dt><dd>{formatDate(cita.fecha)}</dd></div>
        <div><dt className="admin-muted">Horario</dt><dd>{cita.hora_inicio.slice(0, 5)} – {cita.hora_fin.slice(0, 5)}</dd></div>
        <div><dt className="admin-muted">Estado</dt><dd>{cita.estado}</dd></div>
        {cita.descripcion ? <div><dt className="admin-muted">Descripción</dt><dd className="break-words">{cita.descripcion}</dd></div> : null}
      </dl>
    </section>
    <section aria-label="Datos del paciente" className="rounded-xl border border-[#dbe6f2] p-4">
      <h3 className="mb-3 font-bold text-ink-950">Paciente</h3>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div><dt className="admin-muted">Nombres</dt><dd className="break-words">{paciente.nombres}</dd></div>
        <div><dt className="admin-muted">Código</dt><dd>{paciente.codigo_paciente}</dd></div>
      </dl>
    </section>
  </div>
}
