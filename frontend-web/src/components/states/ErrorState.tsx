import { AlertTriangle } from 'lucide-react'
import { Button } from '../ui/Button'

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center"><AlertTriangle className="mb-3 text-red-500"/><p className="font-semibold text-slate-900">No pudimos cargar la información.</p><p className="mt-1 text-sm text-slate-500">Comprueba tu conexión e inténtalo nuevamente.</p>{onRetry ? <Button className="mt-5" onClick={onRetry} variant="secondary">Reintentar</Button> : null}</div>
}
