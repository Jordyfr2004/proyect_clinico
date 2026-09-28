import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { IntegrationPending } from '../../components/states/IntegrationPending'
import { loginSchema, type LoginValues } from './loginSchema'
import { LoginBrand } from './LoginVisual'

export function LoginPage() {
  const [pendingIntegration, setPendingIntegration] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const onSubmit = async (_values: LoginValues) => { setPendingIntegration(true) }

  return (
    <div className="login-content">
      <div className="login-mobile-brand">
        <LoginBrand/>
      </div>
      <div className="login-card">
        <h1 className="login-title">Bienvenido <span>de nuevo</span></h1>
        <p className="login-description">Ingresa con tus credenciales para acceder al sistema</p>
        <form className="login-form" noValidate onSubmit={handleSubmit(onSubmit)}>
          <div className="login-field">
            <label htmlFor="email">Correo electrónico</label>
            <div className="login-input-wrap">
              <Mail aria-hidden="true" className="login-input-icon"/>
              <input
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={Boolean(errors.email)}
                autoComplete="email"
                className="login-input"
                id="email"
                placeholder="tu.correo@clinica.com"
                type="email"
                {...register('email')}
              />
            </div>
            {errors.email ? <p className="login-error" id="email-error">{errors.email.message}</p> : null}
          </div>
          <div className="login-field">
            <label htmlFor="password">Contraseña</label>
            <div className="login-input-wrap">
              <LockKeyhole aria-hidden="true" className="login-input-icon"/>
              <input
                aria-describedby={errors.password ? 'password-error' : undefined}
                aria-invalid={Boolean(errors.password)}
                autoComplete="current-password"
                className="login-input login-password-input"
                id="password"
                placeholder="Ingresa tu contraseña"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
              />
              <button
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                className="login-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                type="button"
              >
                {showPassword ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}
              </button>
            </div>
            {errors.password ? <p className="login-error" id="password-error">{errors.password.message}</p> : null}
            <div className="login-recovery"><Link to="/recuperar-contrasena">¿Olvidaste tu contraseña?</Link></div>
          </div>
          <button className="login-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}<ArrowRight aria-hidden="true"/>
          </button>
        </form>
        {pendingIntegration ? <div className="mt-5"><IntegrationPending compact detail="El formulario está validado. El inicio de sesión se conectará cuando el backend publique su contrato de autenticación Sanctum."/></div> : null}
        <p className="login-authorized"><ShieldCheck aria-hidden="true"/>Uso exclusivo de personal autorizado</p>
      </div>
    </div>
  )
}
