import { useEffect, useRef, useState } from 'react'
import { Radio, X } from 'lucide-react'
import { useAuth } from '../auth/authContext'
import { invalidateClinicalQueries } from '../../services/clinicalQuery'
import { describeAppointmentEvent, readRealtimeConfig, subscribeToDoctorAppointments, type AppointmentEvent, type ConnectionState, type RealtimeConfig, type RealtimeSubscription } from './realtimeService'

type Subscribe = (config: RealtimeConfig, handlers: { onEvent: (event: AppointmentEvent) => void; onState: (state: ConnectionState) => void }) => RealtimeSubscription

const NOTICE_MS = 8_000
const stateLabels: Record<ConnectionState, string> = { connecting: 'Conectando…', connected: 'En vivo', unavailable: 'Sin conexión en vivo' }

// Consumidor reactivo en la web: cuando llega un evento de cita, refresca la
// agenda (sin recargar la página ni consultar cada X segundos) y muestra un aviso.
export function LiveAppointments({ config = readRealtimeConfig(), subscribe = subscribeToDoctorAppointments }: { config?: RealtimeConfig | null; subscribe?: Subscribe }) {
  const { user } = useAuth()
  const [state, setState] = useState<ConnectionState>('connecting')
  const [notices, setNotices] = useState<AppointmentEvent[]>([])
  const timers = useRef(new Map<string, number>())
  const enabled = Boolean(config) && user?.role === 'doctora'

  useEffect(() => {
    if (!enabled || !config) return
    const pending = timers.current
    const subscription = subscribe(config, {
      onState: setState,
      onEvent: (event) => {
        void invalidateClinicalQueries(['agenda'])
        void invalidateClinicalQueries(['dashboard-report'])
        setNotices((current) => [event, ...current.filter((entry) => entry.evento_id !== event.evento_id)].slice(0, 3))
        pending.set(event.evento_id, window.setTimeout(() => {
          pending.delete(event.evento_id)
          setNotices((current) => current.filter((entry) => entry.evento_id !== event.evento_id))
        }, NOTICE_MS))
      },
    })
    return () => {
      subscription.stop()
      pending.forEach((timer) => window.clearTimeout(timer))
      pending.clear()
    }
  }, [enabled, config, subscribe])

  if (!enabled) return null

  const dismiss = (id: string) => setNotices((current) => current.filter((entry) => entry.evento_id !== id))

  return <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col items-end gap-2">
    <ul aria-live="polite" aria-label="Avisos de citas en vivo" className="flex w-full flex-col gap-2">
      {notices.map((event) => <li className="pointer-events-auto flex items-start gap-3 rounded-xl border border-[#b9d7f4] bg-white p-3 text-sm text-ink-950 shadow-lg" key={event.evento_id}>
        <Radio aria-hidden="true" className="mt-0.5 shrink-0 text-clinic-700" size={16}/>
        <p className="min-w-0 flex-1 break-words">{describeAppointmentEvent(event)}<span className="mt-1 block text-xs text-slate-500">Procesado por {event.instancia}</span></p>
        <button aria-label="Cerrar aviso" className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100" onClick={() => dismiss(event.evento_id)} type="button"><X aria-hidden="true" size={14}/></button>
      </li>)}
    </ul>
    <p className={`pointer-events-auto flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold shadow ${state === 'connected' ? 'border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-500'}`} role="status">
      <span aria-hidden="true" className={`size-2 rounded-full ${state === 'connected' ? 'bg-emerald-500' : state === 'connecting' ? 'bg-amber-400' : 'bg-slate-400'}`}/>
      {stateLabels[state]}
    </p>
  </div>
}
