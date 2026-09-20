import { ArrowLeft, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IntegrationPending } from '../../components/states/IntegrationPending'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  return <div className="w-full max-w-md"><span className="grid size-12 place-items-center rounded-xl bg-clinic-100 text-clinic-700"><Mail/></span><h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-950">Recupera tu acceso</h1><p className="mt-3 leading-6 text-slate-500">Ingresa tu correo institucional para solicitar instrucciones de recuperación.</p><form className="mt-8 space-y-5" onSubmit={(event) => { event.preventDefault(); setSubmitted(true) }}><FormField autoComplete="email" id="recovery-email" label="Correo electrónico" required type="email"/><Button className="w-full" type="submit">Solicitar recuperación</Button></form>{submitted ? <div className="mt-5"><IntegrationPending compact detail="La solicitud se enviará cuando el backend disponga del flujo de recuperación."/></div> : null}<Link className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-clinic-700" to="/login"><ArrowLeft size={16}/> Volver al inicio de sesión</Link></div>
}
