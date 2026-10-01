import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { ChangeAssistantPasswordValues } from './assistantService'

const schema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  password_confirmation: z.string().min(1, 'Confirma la contraseña.'),
}).refine(({ password, password_confirmation }) => password === password_confirmation, {
  path: ['password_confirmation'],
  message: 'Las contraseñas deben coincidir.',
})

export function AssistantPasswordForm({ onChangePassword, error }: { onChangePassword: (values: ChangeAssistantPasswordValues) => Promise<boolean>; error: string | null }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ChangeAssistantPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', password_confirmation: '' },
  })
  const submit = async (values: ChangeAssistantPasswordValues) => {
    if (await onChangePassword(values)) reset()
  }
  const inputClassName = 'mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-ink-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600'

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-semibold tracking-tight text-ink-950">Cambiar contraseña de asistente</h2>
      <form aria-label="Cambiar contraseña de asistente" className="mt-6" noValidate onSubmit={handleSubmit(submit)}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-ink-950" htmlFor="assistant-new-password">Nueva contraseña</label>
            <input aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'assistant-new-password-error' : undefined} autoComplete="new-password" className={inputClassName} id="assistant-new-password" type="password" {...register('password')}/>
            {errors.password ? <p className="mt-1 text-sm text-red-700" id="assistant-new-password-error">{errors.password.message}</p> : null}
          </div>
          <div>
            <label className="text-sm font-medium text-ink-950" htmlFor="assistant-confirm-password">Confirmar contraseña</label>
            <input aria-invalid={Boolean(errors.password_confirmation)} aria-describedby={errors.password_confirmation ? 'assistant-confirm-password-error' : undefined} autoComplete="new-password" className={inputClassName} id="assistant-confirm-password" type="password" {...register('password_confirmation')}/>
            {errors.password_confirmation ? <p className="mt-1 text-sm text-red-700" id="assistant-confirm-password-error">{errors.password_confirmation.message}</p> : null}
          </div>
        </div>
        {error ? <p className="mt-5 text-sm text-red-700" role="alert">{error}</p> : null}
        <button className="mt-7 min-h-11 rounded-lg bg-clinic-700 px-5 text-sm font-semibold text-white hover:bg-clinic-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}</button>
      </form>
    </section>
  )
}
