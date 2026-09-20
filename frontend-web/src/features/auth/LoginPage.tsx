import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Stethoscope } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { IntegrationPending } from '../../components/states/IntegrationPending'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { loginSchema, type LoginValues } from './loginSchema'

export function LoginPage() {
  const [pendingIntegration, setPendingIntegration] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const onSubmit = async (_values: LoginValues) => { setPendingIntegration(true) }

  return <div className="w-full max-w-md"><div className="mb-10 flex items-center gap-3 lg:hidden"><span className="grid size-10 place-items-center rounded-xl bg-clinic-600 text-white"><Stethoscope/></span><span className="font-bold text-ink-950">Clínica Dental</span></div><p className="text-sm font-semibold text-clinic-700">Acceso profesional</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-950">Bienvenido de nuevo</h1><p className="mt-3 leading-6 text-slate-500">Ingresa con las credenciales asignadas por la clínica.</p><form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}><FormField autoComplete="email" error={errors.email?.message} id="email" label="Correo electrónico" placeholder="nombre@clinica.com" type="email" {...register('email')}/><FormField autoComplete="current-password" error={errors.password?.message} id="password" label="Contraseña" type="password" {...register('password')}/><div className="flex justify-end"><Link className="text-sm font-semibold text-clinic-700 hover:text-clinic-600" to="/recuperar-contrasena">¿Olvidaste tu contraseña?</Link></div><Button className="w-full" disabled={isSubmitting} type="submit">{isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}<ArrowRight size={17}/></Button></form>{pendingIntegration ? <div className="mt-5"><IntegrationPending compact detail="El formulario está validado. El inicio de sesión se conectará cuando el backend publique su contrato de autenticación Sanctum."/></div> : null}<p className="mt-7 text-center text-xs leading-5 text-slate-400">Uso exclusivo de personal autorizado.</p></div>
}
