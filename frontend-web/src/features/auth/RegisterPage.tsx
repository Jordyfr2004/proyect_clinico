import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useAuth } from './authContext'
import { LoginBrand } from './LoginVisual'
import { registerPatientSchema, type RegisterPatientValues } from './registerPatientSchema'

const inputClassName = 'mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-ink-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600'

export function RegisterPage() {
  const { registerPatient } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterPatientValues>({
    resolver: zodResolver(registerPatientSchema),
    defaultValues: { nombres: '', cedula: '', telefono: '', direccion: '', fecha_nacimiento: '', password: '', password_confirmation: '' },
  })

  const onSubmit = async (values: RegisterPatientValues) => {
    setSubmitError(null)
    try {
      await registerPatient(values)
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 422) {
        const message = (error.response.data as { message?: unknown } | undefined)?.message
        setSubmitError(typeof message === 'string' && message.trim() ? message : 'Revisa los datos del registro.')
      } else if (isAxiosError(error) && !error.response) {
        setSubmitError('No fue posible comunicarse con el servidor. Inténtalo de nuevo.')
      } else {
        setSubmitError('No fue posible crear la cuenta. Inténtalo de nuevo.')
      }
    }
  }

  const field = (name: keyof RegisterPatientValues, label: string, type: string, autoComplete: string) => (
    <div key={name}>
      <label className="block text-sm font-medium text-ink-950" htmlFor={`registration-${name}`}>{label}</label>
      <input
        aria-describedby={errors[name] ? `registration-${name}-error` : undefined}
        aria-invalid={Boolean(errors[name])}
        autoComplete={autoComplete}
        className={inputClassName}
        id={`registration-${name}`}
        type={type}
        {...register(name)}
      />
      {errors[name] ? <p className="mt-1 text-sm text-red-700" id={`registration-${name}-error`}>{errors[name]?.message}</p> : null}
    </div>
  )

  return (
    <div className="login-content">
      <div className="login-mobile-brand"><LoginBrand/></div>
      <div className="login-card">
        <h1 className="login-title">Crear cuenta</h1>
        <p className="login-description">Registra tus datos para acceder al sistema.</p>
        <form aria-label="Registro de paciente" className="mt-7 grid gap-5" noValidate onChange={() => setSubmitError(null)} onSubmit={handleSubmit(onSubmit)}>
          {field('nombres', 'Nombres', 'text', 'name')}
          {field('cedula', 'Cédula', 'text', 'username')}
          {field('telefono', 'Teléfono', 'tel', 'tel')}
          {field('direccion', 'Dirección', 'text', 'street-address')}
          {field('fecha_nacimiento', 'Fecha de nacimiento', 'date', 'bday')}
          {field('password', 'Contraseña', 'password', 'new-password')}
          {field('password_confirmation', 'Confirmar contraseña', 'password', 'new-password')}
          <button className="login-submit mt-1" disabled={isSubmitting} type="submit">{isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}</button>
        </form>
        {submitError ? <p className="login-error mt-5" role="alert">{submitError}</p> : null}
        <Link className="login-text-link registration-back" to="/login"><ArrowLeft aria-hidden="true" size={18}/>Volver al inicio de sesión</Link>
      </div>
    </div>
  )
}
