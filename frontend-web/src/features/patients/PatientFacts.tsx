import type { PatientProfile } from './patientService'

export function PatientFacts({ patient }: { patient: PatientProfile }) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      <div><dt className="text-sm font-medium text-slate-600">Código de paciente</dt><dd className="mt-1 break-words text-ink-950">{patient.codigo_paciente}</dd></div>
      <div><dt className="text-sm font-medium text-slate-600">Nombres</dt><dd className="mt-1 break-words text-ink-950">{patient.nombres}</dd></div>
      <div><dt className="text-sm font-medium text-slate-600">Cédula</dt><dd className="mt-1 break-words text-ink-950">{patient.cedula}</dd></div>
      <div><dt className="text-sm font-medium text-slate-600">Teléfono</dt><dd className="mt-1 break-words text-ink-950">{patient.telefono ?? 'No registrado'}</dd></div>
      <div><dt className="text-sm font-medium text-slate-600">Dirección</dt><dd className="mt-1 break-words text-ink-950">{patient.direccion ?? 'No registrada'}</dd></div>
      <div><dt className="text-sm font-medium text-slate-600">Fecha de nacimiento</dt><dd className="mt-1 break-words text-ink-950">{patient.fecha_nacimiento?.slice(0, 10) ?? 'No registrada'}</dd></div>
    </dl>
  )
}
