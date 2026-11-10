import { isAxiosError } from 'axios'

/** Mensaje para el usuario: el del servidor si lo envía, o uno genérico. */
export function requestError(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible comunicarse con el servidor.'
    const message = (error.response.data as { message?: unknown } | undefined)?.message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}
