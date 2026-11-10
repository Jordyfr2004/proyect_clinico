import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { ClinicalHistoryFields } from './clinicalHistoryService'

const formSchema = z.object({
  sexo: z.string().trim().max(255, 'Máximo 255 caracteres.'),
  lugar_nacimiento: z.string().trim().max(255, 'Máximo 255 caracteres.'),
  antecedentes_enfermedades: z.string().trim(),
  cirugias: z.string().trim(),
  medicacion_actual: z.string().trim(),
})

type FormValues = z.infer<typeof formSchema>
type FieldName = keyof FormValues

const fields: { name: FieldName; label: string; placeholder: string; multiline?: boolean }[] = [
  { name: 'sexo', label: 'Sexo', placeholder: 'Ej. femenino' },
  { name: 'lugar_nacimiento', label: 'Lugar de nacimiento', placeholder: 'Ciudad y provincia' },
  { name: 'antecedentes_enfermedades', label: 'Antecedentes de enfermedades', placeholder: 'Enfermedades previas o condiciones relevantes', multiline: true },
  { name: 'cirugias', label: 'Cirugías', placeholder: 'Procedimientos y fechas, si aplica', multiline: true },
  { name: 'medicacion_actual', label: 'Medicación actual', placeholder: 'Medicamentos y dosis actuales', multiline: true },
]

const controlClass = 'admin-input mt-2 w-full text-sm transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2'

export function ClinicalHistoryForm({ initial, error, onSave, onCancel }: {
  initial?: ClinicalHistoryFields
  error: string | null
  onSave: (values: ClinicalHistoryFields) => Promise<void>
  onCancel?: () => void
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sexo: initial?.sexo ?? '',
      lugar_nacimiento: initial?.lugar_nacimiento ?? '',
      antecedentes_enfermedades: initial?.antecedentes_enfermedades ?? '',
      cirugias: initial?.cirugias ?? '',
      medicacion_actual: initial?.medicacion_actual ?? '',
    },
  })

  const submit = async (values: FormValues) => {
    await onSave({
      sexo: values.sexo || null,
      lugar_nacimiento: values.lugar_nacimiento || null,
      antecedentes_enfermedades: values.antecedentes_enfermedades || null,
      cirugias: values.cirugias || null,
      medicacion_actual: values.medicacion_actual || null,
    })
  }

  const renderField = ({ name, label, placeholder, multiline }: (typeof fields)[number]) => (
    <div className="min-w-0" key={name}>
      <label className="block text-sm font-medium text-ink-950" htmlFor={`history-${name}`}>{label}</label>
      {multiline ? (
        <textarea aria-describedby={errors[name] ? `history-${name}-error` : undefined} aria-invalid={Boolean(errors[name])} className={`${controlClass} min-h-20 resize-y py-2.5 leading-6`} id={`history-${name}`} placeholder={placeholder} rows={2} {...register(name)}/>
      ) : (
        <input aria-describedby={errors[name] ? `history-${name}-error` : undefined} aria-invalid={Boolean(errors[name])} autoFocus={name === 'sexo' && Boolean(initial)} className={`${controlClass} h-12`} id={`history-${name}`} placeholder={placeholder} type="text" {...register(name)}/>
      )}
      {errors[name] ? <p className="mt-1 text-sm text-red-700" id={`history-${name}-error`}>{errors[name]?.message}</p> : null}
    </div>
  )

  return (
    <form aria-label={initial ? 'Editar historial clínico' : 'Registrar historial clínico'} className="mx-auto grid w-full max-w-[1000px] gap-7" noValidate onSubmit={handleSubmit(submit)}>
      <section aria-labelledby="history-general-title" className="space-y-4 border-b border-[#e4ecf6] pb-7">
        <h3 className="text-base font-semibold text-[#1559a2]" id="history-general-title">Información general</h3>
        <div className="grid gap-4 sm:grid-cols-2">{fields.slice(0, 2).map(renderField)}</div>
      </section>
      <section aria-labelledby="history-background-title" className="space-y-4 border-b border-[#e4ecf6] pb-7">
        <h3 className="text-base font-semibold text-[#1559a2]" id="history-background-title">Antecedentes médicos</h3>
        {renderField(fields[2])}
      </section>
      <section aria-labelledby="history-care-title" className="space-y-4">
        <h3 className="text-base font-semibold text-[#1559a2]" id="history-care-title">Cirugías y medicación</h3>
        <div className="grid gap-4 sm:grid-cols-2">{fields.slice(3).map(renderField)}</div>
      </section>
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#e4ecf6] pt-5">
        {onCancel ? <button className="admin-secondary min-h-11 rounded-[10px] px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} onClick={onCancel} type="button">Cancelar</button> : null}
        <button className="admin-primary min-h-11 rounded-[10px] px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Guardar historial'}</button>
      </div>
    </form>
  )
}
