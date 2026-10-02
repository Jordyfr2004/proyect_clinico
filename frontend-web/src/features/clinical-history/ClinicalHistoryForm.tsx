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

const fields: { name: FieldName; label: string; multiline?: boolean }[] = [
  { name: 'sexo', label: 'Sexo' },
  { name: 'lugar_nacimiento', label: 'Lugar de nacimiento' },
  { name: 'antecedentes_enfermedades', label: 'Antecedentes de enfermedades', multiline: true },
  { name: 'cirugias', label: 'Cirugías', multiline: true },
  { name: 'medicacion_actual', label: 'Medicación actual', multiline: true },
]

const controlClass = 'admin-input mt-2 w-full py-2 focus-visible:outline-2 focus-visible:outline-offset-2'

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

  const renderField = ({ name, label, multiline }: (typeof fields)[number]) => (
    <div key={name}>
      <label className="block text-sm font-semibold text-ink-950" htmlFor={`history-${name}`}>{label}</label>
      {multiline ? (
        <textarea aria-describedby={errors[name] ? `history-${name}-error` : undefined} aria-invalid={Boolean(errors[name])} className={`${controlClass} min-h-28 resize-y`} id={`history-${name}`} rows={4} {...register(name)}/>
      ) : (
        <input aria-describedby={errors[name] ? `history-${name}-error` : undefined} aria-invalid={Boolean(errors[name])} autoFocus={name === 'sexo'} className={controlClass} id={`history-${name}`} type="text" {...register(name)}/>
      )}
      {errors[name] ? <p className="mt-1 text-sm text-red-700" id={`history-${name}-error`}>{errors[name]?.message}</p> : null}
    </div>
  )

  return (
    <form aria-label={initial ? 'Editar historial clínico' : 'Registrar historial clínico'} className="grid gap-5" noValidate onSubmit={handleSubmit(submit)}>
      <fieldset className="admin-tint grid gap-4 rounded-[16px] p-5 sm:grid-cols-2"><legend className="px-2 text-sm font-bold text-[#1559a2]">Información general</legend>{fields.slice(0, 2).map(renderField)}</fieldset>
      <fieldset className="grid gap-5"><legend className="mb-4 text-sm font-bold text-[#1559a2]">Antecedentes, cirugías y medicación</legend>{fields.slice(2).map(renderField)}</fieldset>
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button className="admin-primary min-h-11 rounded-[10px] px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Guardar historial'}</button>
        {onCancel ? <button className="admin-secondary min-h-11 rounded-[10px] px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} onClick={onCancel} type="button">Cancelar</button> : null}
      </div>
    </form>
  )
}
