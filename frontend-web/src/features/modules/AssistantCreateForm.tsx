import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { CreateAssistantValues } from '../assistant/assistantService'

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(255, 'Máximo 255 caracteres.'),
  email: z.email('Ingresa un correo válido.').max(255, 'Máximo 255 caracteres.'),
  username: z.string().trim().min(1, 'El usuario es obligatorio.').max(255, 'Máximo 255 caracteres.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
})

const inputClassName = 'admin-input mt-2 w-full focus-visible:outline-2 focus-visible:outline-offset-2'

export function AssistantCreateForm({ onCreate, onCancel, error }: { onCreate: (values: CreateAssistantValues) => Promise<boolean>; onCancel?: () => void; error: string | null }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateAssistantValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', username: '', password: '' },
  })

  const submit = async (values: CreateAssistantValues) => {
    if (await onCreate(values)) reset()
  }

  return (
    <div>
      <p className="admin-muted text-sm leading-6">Completa los datos de la única cuenta de asistente de la clínica.</p>
      <form aria-label="Datos para crear cuenta de asistente" className="mt-7" noValidate onSubmit={handleSubmit(submit)}>
        <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-ink-950" htmlFor="assistant-name">Nombre</label>
            <input aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'assistant-name-error' : undefined} autoComplete="name" className={inputClassName} data-dialog-initial id="assistant-name" type="text" {...register('name')}/>
            {errors.name ? <p className="mt-1 text-sm text-red-700" id="assistant-name-error">{errors.name.message}</p> : null}
          </div>
          <div>
            <label className="text-sm font-medium text-ink-950" htmlFor="assistant-email">Correo electrónico</label>
            <input aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'assistant-email-error' : undefined} autoComplete="email" className={inputClassName} id="assistant-email" type="email" {...register('email')}/>
            {errors.email ? <p className="mt-1 text-sm text-red-700" id="assistant-email-error">{errors.email.message}</p> : null}
          </div>
          <div>
            <label className="text-sm font-medium text-ink-950" htmlFor="assistant-username">Usuario</label>
            <input aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? 'assistant-username-error' : undefined} autoComplete="username" className={inputClassName} id="assistant-username" type="text" {...register('username')}/>
            {errors.username ? <p className="mt-1 text-sm text-red-700" id="assistant-username-error">{errors.username.message}</p> : null}
          </div>
          <div>
            <label className="text-sm font-medium text-ink-950" htmlFor="assistant-password">Contraseña</label>
            <input aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'assistant-password-error' : undefined} autoComplete="new-password" className={inputClassName} id="assistant-password" type="password" {...register('password')}/>
            {errors.password ? <p className="mt-1 text-sm text-red-700" id="assistant-password-error">{errors.password.message}</p> : null}
          </div>
        </div>
        {error ? <p className="mt-5 text-sm text-red-700" role="alert">{error}</p> : null}
        <div className="mt-7 flex flex-wrap gap-3"><button className="admin-primary min-h-11 rounded-[10px] px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? 'Creando cuenta…' : 'Crear cuenta de asistente'}</button>{onCancel ? <button className="admin-secondary min-h-11 rounded-[10px] px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} onClick={onCancel} type="button">Cancelar</button> : null}</div>
      </form>
    </div>
  )
}
