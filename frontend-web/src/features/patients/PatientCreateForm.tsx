import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { createPatientSchema, type CreatePatientFormValues } from './createPatientSchema'
import type { CreatePatientPayload } from './patientService'

const inputClassName = 'mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-ink-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600'

export function PatientCreateForm({ onCreate, onCancel, error }: { onCreate: (values: CreatePatientPayload) => Promise<boolean>; onCancel: () => void; error: string | null }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreatePatientFormValues>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: { nombres: '', cedula: '', telefono: '', direccion: '', fecha_nacimiento: '' },
  })

  const submit = async (values: CreatePatientFormValues) => {
    await onCreate({
      nombres: values.nombres,
      cedula: values.cedula,
      telefono: values.telefono || null,
      direccion: values.direccion || null,
      fecha_nacimiento: values.fecha_nacimiento || null,
    })
  }

  const field = (name: keyof CreatePatientFormValues, label: string, type: string, required: boolean) => (
    <div key={name}>
      <label className="text-sm font-medium text-ink-950" htmlFor={`new-patient-${name}`}>{label}{required ? ' *' : ''}</label>
      <input aria-describedby={errors[name] ? `new-patient-${name}-error` : undefined} aria-invalid={Boolean(errors[name])} autoFocus={name === 'nombres'} className={inputClassName} id={`new-patient-${name}`} type={type} {...register(name)}/>
      {errors[name] ? <p className="mt-1 text-sm text-red-700" id={`new-patient-${name}-error`}>{errors[name]?.message}</p> : null}
    </div>
  )

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="create-patient-title" id="patient-create-panel">
      <h2 className="text-xl font-semibold text-ink-950" id="create-patient-title">Registrar paciente</h2>
      <p className="mt-2 text-sm text-slate-600">Los campos marcados con * son obligatorios.</p>
      <form aria-label="Datos del nuevo paciente" className="mt-6" noValidate onSubmit={handleSubmit(submit)}>
        <div className="grid gap-5 sm:grid-cols-2">
          {field('nombres', 'Nombres', 'text', true)}
          {field('cedula', 'Cédula', 'text', true)}
          {field('telefono', 'Teléfono', 'tel', false)}
          {field('direccion', 'Dirección', 'text', false)}
          {field('fecha_nacimiento', 'Fecha de nacimiento', 'date', false)}
        </div>
        {error ? <p className="mt-5 text-sm text-red-700" role="alert">{error}</p> : null}
        <div className="mt-7 flex flex-wrap gap-3">
          <button className="min-h-11 rounded-lg bg-clinic-700 px-5 text-sm font-semibold text-white hover:bg-clinic-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? 'Registrando…' : 'Guardar paciente'}</button>
          <button className="min-h-11 rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} onClick={onCancel} type="button">Cancelar</button>
        </div>
      </form>
    </section>
  )
}
