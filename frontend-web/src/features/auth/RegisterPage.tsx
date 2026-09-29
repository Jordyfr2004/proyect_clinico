import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { IntegrationPending } from '../../components/states/IntegrationPending'
import { LoginBrand } from './LoginVisual'

export function RegisterPage() {
  return (
    <div className="login-content">
      <div className="login-mobile-brand"><LoginBrand/></div>
      <div className="login-card">
        <h1 className="login-title">Crear cuenta</h1>
        <p className="login-description">El registro de clientes aún no está disponible.</p>
        <div className="mt-9"><IntegrationPending detail="Podrás crear tu cuenta aquí cuando se complete la integración del registro."/></div>
        <Link className="login-text-link registration-back" to="/login"><ArrowLeft aria-hidden="true" size={18}/>Volver al inicio de sesión</Link>
      </div>
    </div>
  )
}
