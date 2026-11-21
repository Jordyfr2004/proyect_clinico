import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

// Evento que publica el backend (App\Events\CitaActualizada) por Laravel Reverb.
export const appointmentEventSchema = z.object({
  evento_id: z.string(),
  tipo: z.enum(['solicitada', 'creada', 'programada', 'reprogramacion_solicitada', 'reprogramada', 'cancelada', 'completada', 'actualizada']),
  cita_id: z.string(),
  paciente_id: z.string(),
  paciente_nombre: z.string().nullable(),
  estado: z.string(),
  fecha: z.string().nullable(),
  hora_inicio: z.string().nullable(),
  instancia: z.string(),
  ocurrido_en: z.string(),
})

export type AppointmentEvent = z.infer<typeof appointmentEventSchema>
export type ConnectionState = 'connecting' | 'connected' | 'unavailable'

export type RealtimeConfig = { key: string; host: string; port: number; secure: boolean }

export function readRealtimeConfig(env: Record<string, string | undefined> = import.meta.env): RealtimeConfig | null {
  const key = env.VITE_REVERB_APP_KEY?.trim()
  if (!key) return null
  const secure = env.VITE_REVERB_SCHEME === 'https'
  const host = env.VITE_REVERB_HOST?.trim() || (typeof window !== 'undefined' ? window.location.hostname : 'localhost')
  const port = Number(env.VITE_REVERB_PORT) || (secure ? 443 : 80)
  return { key, host, port, secure }
}

export function parseAppointmentEvent(payload: unknown): AppointmentEvent | null {
  const result = appointmentEventSchema.safeParse(payload)
  return result.success ? result.data : null
}

const actions: Record<AppointmentEvent['tipo'], string> = {
  solicitada: 'solicitó una cita',
  creada: 'tiene una nueva cita',
  programada: 'tiene su cita programada',
  reprogramacion_solicitada: 'pidió reprogramar su cita',
  reprogramada: 'tiene su cita reprogramada',
  cancelada: 'canceló su cita',
  completada: 'completó su cita',
  actualizada: 'tiene cambios en su cita',
}

export function describeAppointmentEvent(event: AppointmentEvent): string {
  const when = event.fecha ? ` (${event.fecha}${event.hora_inicio ? ` ${event.hora_inicio}` : ''})` : ''
  return `${event.paciente_nombre ?? 'Un paciente'} ${actions[event.tipo]}${when}`
}

export type RealtimeSubscription = { stop: () => void }

type Handlers = { onEvent: (event: AppointmentEvent) => void; onState: (state: ConnectionState) => void }

// Suscribe al canal privado de la doctora. La autorización del canal la hace el
// backend (/api/broadcasting/auth) con el mismo token Bearer de la sesión.
export function subscribeToDoctorAppointments(config: RealtimeConfig, handlers: Handlers): RealtimeSubscription {
  const echo = new Echo({
    broadcaster: 'reverb',
    key: config.key,
    wsHost: config.host,
    wsPort: config.port,
    wssPort: config.port,
    forceTLS: config.secure,
    enabledTransports: ['ws', 'wss'],
    Pusher,
    authorizer: (channel: { name: string }) => ({
      authorize: (socketId: string, callback: (error: Error | null, data: { auth: string } | null) => void) => {
        apiClient.post('/broadcasting/auth', { socket_id: socketId, channel_name: channel.name })
          .then((response) => callback(null, response.data as { auth: string }))
          .catch((error: Error) => callback(error, null))
      },
    }),
  })

  const connection = echo.connector.pusher.connection
  const onStateChange = ({ current }: { current: string }) => {
    handlers.onState(current === 'connected' ? 'connected' : current === 'connecting' || current === 'initialized' ? 'connecting' : 'unavailable')
  }
  connection.bind('state_change', onStateChange)

  echo.private('clinica.doctora').listen('.cita_actualizada', (payload: unknown) => {
    const event = parseAppointmentEvent(payload)
    if (event) handlers.onEvent(event)
  })

  return {
    stop: () => {
      connection.unbind('state_change', onStateChange)
      echo.leave('clinica.doctora')
      echo.disconnect()
    },
  }
}
