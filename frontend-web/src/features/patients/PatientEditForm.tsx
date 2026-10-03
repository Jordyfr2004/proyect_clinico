import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { createPatientSchema, type CreatePatientFormValues } from './createPatientSchema'
import type { Patient, UpdatePatientPayload } from './patientService'

export function PatientEditForm({ patient, error, onSave, onCancel }: { patient: Patient; error: string | null; onSave: (values: UpdatePatientPayload) => Promise<boolean>; onCancel: () => void }) {
  const initial: CreatePatientFormValues = {
    nombres: patient.nombres, cedula: patient.cedula, telefono: patient.telefono ?? '',
    direccion: patient.direccion ?? '', fecha_nacimiento: patient.fecha_nacimiento?.slice(0, 10) ?? '',
  }
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreatePatientFormValues>({ resolver: zodResolver(createPatientSchema), defaultValues: initial })
  const submit = async (values: CreatePatientFormValues) => {
    const payload: UpdatePatientPayload = {}
    if (values.nombres !== initial.nombres) payload.nombres = values.nombres
    if (values.cedula !== initial.cedula) payload.cedula = values.cedula
    if (values.telefono !== initial.telefono) payload.telefono = values.telefono || null
    if (values.direccion !== initial.direccion) payload.direccion = values.direccion || null
    if (values.fecha_nacimiento !== initial.fecha_nacimiento) payload.fecha_nacimiento = values.fecha_nacimiento || null
    if (Object.keys(payload).length) await onSave(payload)
    else onCancel()
  }
  const field = (name: keyof CreatePatientFormValues, label: string, type: string) => (
    <div key={name}>
      <label className="text-sm font-medium text-ink-950" htmlFor={`edit-patient-${name}`}>{label}</label>
      <input aria-describedby={errors[name] ? `edit-patient-${name}-error` : undefined} aria-invalid={Boolean(errors[name])} className="admin-input mt-2 w-full focus-visible:outline-2 focus-visible:outline-offset-2" data-dialog-initial={name === 'nombres' ? '' : undefined} id={`edit-patient-${name}`} type={type} {...register(name)}/>
      {errors[name] ? <p className="mt-1 text-sm text-red-700" id={`edit-patient-${name}-error`}>{errors[name]?.message}</p> : null}
    </div>
  )
  return <form aria-label="Editar datos del paciente" noValidate onSubmit={handleSubmit(submit)}>
    <p className="admin-muted mb-5 text-sm">Código de paciente: <strong>{patient.codigo_paciente}</strong></p>
    <div className="grid gap-5 sm:grid-cols-2">
      {field('nombres', 'Nombres', 'text')}{field('cedula', 'Cédula', 'text')}
      {field('telefono', 'Teléfono', 'tel')}{field('direccion', 'Dirección', 'text')}
      {field('fecha_nacimiento', 'Fecha de nacimiento', 'date')}
    </div>
    {error ? <p className="mt-5 text-sm text-red-700" role="alert">{error}</p> : null}
    <div className="mt-7 flex flex-wrap gap-3">
      <button className="admin-primary min-h-11 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? 'Guardando…' : 'Guardar cambios'}</button>
      <button className="admin-secondary min-h-11 rounded-[10px] px-5 text-sm font-semibold disabled:opacity-60" disabled={isSubmitting} onClick={onCancel} type="button">Cancelar</button>
    </div>
  </form>
}
