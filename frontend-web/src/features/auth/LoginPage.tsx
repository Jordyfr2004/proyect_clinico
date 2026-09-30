import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { ArrowRight, Eye, EyeOff, IdCard, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useAuth } from './authContext'
import { loginSchema, type LoginValues } from './loginSchema'
import { LoginBrand } from './LoginVisual'

export function LoginPage() {
  const { login, sessionError } = useAuth()
  const [loginError, setLoginError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { username: '', password: '' } })
  const onSubmit = async (values: LoginValues) => {
    setLoginError(null)
    try {
      await login(values)
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 422) {
        const message = (error.response.data as { message?: unknown } | undefined)?.message
        setLoginError(typeof message === 'string' && message.trim() ? message : 'No fue posible iniciar sesión. Revisa tus credenciales.')
      } else if (isAxiosError(error) && !error.response) {
        setLoginError('No fue posible comunicarse con el servidor. Inténtalo de nuevo.')
      } else {
        setLoginError('No fue posible iniciar sesión. Inténtalo de nuevo.')
      }
    }
  }

  return (
    <div className="login-content">
      <div className="login-mobile-brand">
        <LoginBrand/>
      </div>
      <div className="login-card">
        <h1 className="login-title">Bienvenido <span>de nuevo</span></h1>
        <p className="login-description">Ingresa con tus credenciales para acceder al sistema</p>
        <form className="login-form" noValidate onChange={() => setLoginError(null)} onSubmit={handleSubmit(onSubmit)}>
          <div className="login-field">
            <label htmlFor="username">Cédula</label>
            <div className="login-input-wrap">
              <IdCard aria-hidden="true" className="login-input-icon"/>
              <input
                aria-describedby={errors.username ? 'username-error' : undefined}
                aria-invalid={Boolean(errors.username)}
                autoComplete="username"
                className="login-input"
                id="username"
                placeholder="Ingresa tu número de cédula"
                type="text"
                {...register('username')}
              />
            </div>
            {errors.username ? <p className="login-error" id="username-error">{errors.username.message}</p> : null}
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
        {loginError || sessionError ? <p className="login-error mt-5" role="alert">{loginError ?? sessionError}</p> : null}
        <p className="login-create-account">¿No tienes una cuenta? <Link className="login-text-link" to="/registro">Crear cuenta</Link></p>
      </div>
    </div>
  )
}
