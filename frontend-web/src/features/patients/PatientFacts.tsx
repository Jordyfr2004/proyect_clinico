import type { PatientProfile } from './patientService'

function formatBirthDate(value: string | null): string {
  if (value === null) return 'No registrada'
  const datePart = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return value
  const date = new Date(`${datePart}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== datePart) return value
  return new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

export function PatientFacts({ patient }: { patient: PatientProfile }) {
  return (
    <dl className="grid gap-x-10 sm:grid-cols-2">
      <div className="admin-fact"><dt className="admin-meta text-xs font-semibold uppercase tracking-wide">Código de paciente</dt><dd className="mt-2 break-words font-semibold text-ink-950">{patient.codigo_paciente}</dd></div>
      <div className="admin-fact"><dt className="admin-meta text-xs font-semibold uppercase tracking-wide">Nombres</dt><dd className="mt-2 break-words font-semibold text-ink-950">{patient.nombres}</dd></div>
      <div className="admin-fact"><dt className="admin-meta text-xs font-semibold uppercase tracking-wide">Cédula</dt><dd className="mt-2 break-words font-semibold text-ink-950">{patient.cedula}</dd></div>
      <div className="admin-fact"><dt className="admin-meta text-xs font-semibold uppercase tracking-wide">Teléfono</dt><dd className="mt-2 break-words font-semibold text-ink-950">{patient.telefono ?? 'No registrado'}</dd></div>
      <div className="admin-fact"><dt className="admin-meta text-xs font-semibold uppercase tracking-wide">Dirección</dt><dd className="mt-2 break-words font-semibold text-ink-950">{patient.direccion ?? 'No registrada'}</dd></div>
      <div className="admin-fact"><dt className="admin-meta text-xs font-semibold uppercase tracking-wide">Fecha de nacimiento</dt><dd className="mt-2 break-words font-semibold text-ink-950">{formatBirthDate(patient.fecha_nacimiento)}</dd></div>
    </dl>
  )
}
