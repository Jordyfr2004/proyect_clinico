import { ArrowLeft, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { IntegrationPending } from '../../components/states/IntegrationPending'

export function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <span aria-hidden="true" className="grid size-12 place-items-center rounded-xl bg-clinic-100 text-clinic-700">
        <Mail/>
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-950">Recupera tu acceso</h1>
      <p className="mt-3 leading-6 text-slate-600">La recuperación de contraseña todavía no está disponible.</p>
      <div className="mt-8">
        <IntegrationPending compact detail="Esta función estará disponible cuando se complete su integración con el backend."/>
      </div>
      <Link className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-clinic-700 hover:text-clinic-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" to="/login">
        <ArrowLeft aria-hidden="true" size={16}/>Volver al inicio de sesión
      </Link>
    </div>
  )
}
