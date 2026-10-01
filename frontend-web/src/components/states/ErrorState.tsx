import { AlertTriangle } from 'lucide-react'
import { Button } from '../ui/Button'

export function ErrorState({ onRetry, description = 'Comprueba tu conexión e inténtalo nuevamente.' }: { onRetry?: () => void; description?: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center" role="alert">
      <span aria-hidden="true" className="mb-4 grid size-12 place-items-center rounded-xl bg-red-50 text-red-600"><AlertTriangle size={24}/></span>
      <p className="font-semibold text-slate-900">No pudimos cargar la información.</p>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {onRetry ? <Button className="mt-5" onClick={onRetry} type="button" variant="secondary">Reintentar</Button> : null}
    </div>
  )
}
