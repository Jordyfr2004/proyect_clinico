import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { ArrowLeft, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { requestPasswordReset, resetPassword } from './authService'

const emailSchema = z.object({ email: z.email('Ingresa un correo válido.').max(254, 'El correo es demasiado largo.') })
const resetSchema = z.object({
  code: z.string().regex(/^[0-9]{6}$/, 'Ingresa el código de seis dígitos.'),
  password: z.string().min(8, 'La contraseña debe tener al menos ocho caracteres.').refine((value) => new TextEncoder().encode(value).length <= 72, 'La contraseña no puede superar 72 bytes.'),
  password_confirmation: z.string().min(1, 'Confirma la contraseña.'),
}).refine(({ password, password_confirmation }) => password === password_confirmation, { path: ['password_confirmation'], message: 'Las contraseñas no coinciden.' })

type EmailValues = z.infer<typeof emailSchema>
type ResetValues = z.infer<typeof resetSchema>

function responseError(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible comunicarse con el servidor.'
    if ([422, 429, 503].includes(error.response.status)) {
      const message = (error.response.data as { message?: unknown } | undefined)?.message
      if (typeof message === 'string' && message.trim()) return message
      if (error.response.status === 429) return 'Demasiados intentos. Espera antes de volver a probar.'
      if (error.response.status === 503) return 'El servicio de recuperación no está disponible ahora.'
    }
  }
  return 'No fue posible completar la solicitud. Inténtalo más tarde.'
}

function EmailStep({ onComplete }: { onComplete: (email: string, message: string) => void }) {
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } })
  const submit = async ({ email }: EmailValues) => {
    setError(null)
    try { onComplete(email, await requestPasswordReset(email)) }
    catch (cause) { setError(responseError(cause)) }
  }
  return <form className="mt-7 space-y-5" noValidate onSubmit={handleSubmit(submit)}>
    <div><label className="block text-sm font-semibold text-ink-950" htmlFor="recovery-email">Correo electrónico</label><input aria-describedby={errors.email ? 'recovery-email-error' : undefined} aria-invalid={Boolean(errors.email)} autoComplete="email" className="admin-input mt-2 w-full" id="recovery-email" type="email" {...register('email')}/>{errors.email ? <p className="mt-1 text-sm text-red-700" id="recovery-email-error">{errors.email.message}</p> : null}</div>
    {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
    <button className="admin-primary min-h-11 w-full rounded-lg px-4 font-semibold disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? 'Procesando…' : 'Solicitar código'}</button>
  </form>
}

function CodeStep({ email, requestMessage, onComplete, onChangeEmail }: { email: string; requestMessage: string; onComplete: (message: string) => void; onChangeEmail: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { code: '', password: '', password_confirmation: '' } })
  const submit = async (values: ResetValues) => {
    setError(null)
    try { const message = await resetPassword({ email, ...values }); reset(); onComplete(message) }
    catch (cause) { setError(responseError(cause)) }
  }
  return <div className="mt-6"><p className="admin-success rounded-lg p-3 text-sm" role="status">{requestMessage}</p><p className="admin-muted mt-3 text-sm">Correo indicado: {email}. El código tiene una vigencia de cinco minutos.</p><button className="mt-2 text-sm font-semibold text-clinic-700 underline" onClick={onChangeEmail} type="button">Cambiar correo</button><form className="mt-5 space-y-4" noValidate onSubmit={handleSubmit(submit)}>
    <div><label className="block text-sm font-semibold text-ink-950" htmlFor="recovery-code">Código de recuperación</label><input aria-describedby={errors.code ? 'recovery-code-error' : undefined} aria-invalid={Boolean(errors.code)} autoComplete="one-time-code" className="admin-input mt-2 w-full" id="recovery-code" inputMode="numeric" maxLength={6} type="text" {...register('code')}/>{errors.code ? <p className="mt-1 text-sm text-red-700" id="recovery-code-error">{errors.code.message}</p> : null}</div>
    <div><label className="block text-sm font-semibold text-ink-950" htmlFor="recovery-password">Nueva contraseña</label><input aria-describedby={errors.password ? 'recovery-password-error' : undefined} aria-invalid={Boolean(errors.password)} autoComplete="new-password" className="admin-input mt-2 w-full" id="recovery-password" type="password" {...register('password')}/>{errors.password ? <p className="mt-1 text-sm text-red-700" id="recovery-password-error">{errors.password.message}</p> : null}</div>
    <div><label className="block text-sm font-semibold text-ink-950" htmlFor="recovery-confirm">Confirmar contraseña</label><input aria-describedby={errors.password_confirmation ? 'recovery-confirm-error' : undefined} aria-invalid={Boolean(errors.password_confirmation)} autoComplete="new-password" className="admin-input mt-2 w-full" id="recovery-confirm" type="password" {...register('password_confirmation')}/>{errors.password_confirmation ? <p className="mt-1 text-sm text-red-700" id="recovery-confirm-error">{errors.password_confirmation.message}</p> : null}</div>
    {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
    <button className="admin-primary min-h-11 w-full rounded-lg px-4 font-semibold disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? 'Actualizando…' : 'Restablecer contraseña'}</button>
  </form></div>
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [completed, setCompleted] = useState<string | null>(null)
  return <div className="w-full max-w-md">
    <span aria-hidden="true" className="grid size-12 place-items-center rounded-xl bg-clinic-100 text-clinic-700"><Mail/></span>
    <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-950">Recupera tu acceso</h1>
    <p className="mt-3 leading-6 text-slate-600">Solicita un código con tu correo electrónico para restablecer la contraseña.</p>
    {completed ? <p className="admin-success mt-7 rounded-lg p-4 text-sm" role="status">{completed}</p> : email === null ? <EmailStep onComplete={(value, message) => { setEmail(value); setRequestMessage(message) }}/> : <CodeStep email={email} onChangeEmail={() => setEmail(null)} onComplete={setCompleted} requestMessage={requestMessage}/>}
    <Link className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-clinic-700 hover:text-clinic-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" to="/login"><ArrowLeft aria-hidden="true" size={16}/>Volver al inicio de sesión</Link>
  </div>
}
