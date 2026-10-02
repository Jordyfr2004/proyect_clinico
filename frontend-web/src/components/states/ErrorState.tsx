import { AlertTriangle } from 'lucide-react'
import { Button } from '../ui/Button'

export function ErrorState({ onRetry, description = 'Comprueba tu conexión e inténtalo nuevamente.' }: { onRetry?: () => void; description?: string }) {
  return (
    <div className="admin-state admin-surface flex min-h-48 flex-col items-center justify-center rounded-[20px] px-6 py-11 text-center" role="alert">
      <span aria-hidden="true" className="mb-5 grid size-14 place-items-center rounded-2xl border border-red-100 bg-red-50 text-red-700"><AlertTriangle size={26}/></span>
      <p className="text-base font-semibold text-slate-900">No pudimos cargar la información.</p>
      <p className="admin-muted mt-2 max-w-md text-sm leading-6">{description}</p>
      {onRetry ? <Button className="admin-interactive mt-6" onClick={onRetry} type="button" variant="secondary">Reintentar</Button> : null}
    </div>
  )
}
