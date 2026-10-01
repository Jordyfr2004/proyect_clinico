import { isAxiosError } from 'axios'

export function patientLoadError(error: unknown): string {
  if (isAxiosError(error)) {
    return error.response
      ? `El servidor respondió con HTTP ${error.response.status}. Inténtalo nuevamente.`
      : 'No fue posible comunicarse con el servidor. Inténtalo nuevamente.'
  }
  return 'La respuesta del servidor no contiene datos de paciente válidos.'
}
