import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/authContext'
import type { AuthUser } from '../auth/authService'
import * as clinicalQuery from '../../services/clinicalQuery'
import { LiveAppointments } from './LiveAppointments'
import { describeAppointmentEvent, parseAppointmentEvent, readRealtimeConfig, type AppointmentEvent, type ConnectionState } from './realtimeService'

const doctor: AuthUser = { id: 'doctor-1', name: 'María López', username: 'mlopez', email: 'maria@clinica.test', role: 'doctora', paciente_id: null, activo: true, foto_perfil_url: null }
const config = { key: 'clinica-clave', host: 'localhost', port: 80, secure: false }
const event: AppointmentEvent = {
  evento_id: 'e-1', tipo: 'solicitada', cita_id: 'c-1', paciente_id: 'p-1', paciente_nombre: 'Ana Pérez',
  estado: 'pendiente', fecha: null, hora_inicio: null, instancia: 'backend1', ocurrido_en: '2026-11-17T10:00:00-05:00',
}

function renderWith(user: AuthUser) {
  let handlers: { onEvent: (event: AppointmentEvent) => void; onState: (state: ConnectionState) => void } | undefined
  const stop = vi.fn()
  const subscribe = vi.fn((_config, received) => { handlers = received; return { stop } })
  const auth = { status: 'authenticated' as const, user, sessionError: null, login: vi.fn(), logout: vi.fn() }
  const view = render(<AuthContext.Provider value={auth}><LiveAppointments config={config} subscribe={subscribe}/></AuthContext.Provider>)
  return { view, subscribe, stop, emit: (e: AppointmentEvent) => act(() => handlers?.onEvent(e)), state: (s: ConnectionState) => act(() => handlers?.onState(s)) }
}

describe('citas en tiempo real', () => {
  it('refreshes the agenda and shows a notice when an appointment event arrives', () => {
    const invalidate = vi.spyOn(clinicalQuery, 'invalidateClinicalQueries').mockResolvedValue()
    const { emit, state } = renderWith(doctor)

    state('connected')
    expect(screen.getByRole('status')).toHaveTextContent('En vivo')

    emit(event)
    expect(invalidate).toHaveBeenCalledWith(['agenda'])
    expect(screen.getByText('Ana Pérez solicitó una cita')).toBeInTheDocument()
    expect(screen.getByText('Procesado por backend1')).toBeInTheDocument()
  })

  it('stays off for other roles and closes the connection on unmount', () => {
    const asistente = renderWith({ ...doctor, role: 'asistente' })
    expect(asistente.subscribe).not.toHaveBeenCalled()
    asistente.view.unmount()

    const doctora = renderWith(doctor)
    doctora.view.unmount()
    expect(doctora.stop).toHaveBeenCalledOnce()
  })

  it('validates the payload and builds readable messages', () => {
    expect(parseAppointmentEvent({ tipo: 'solicitada' })).toBeNull()
    expect(parseAppointmentEvent(event)).toEqual(event)
    expect(describeAppointmentEvent({ ...event, tipo: 'programada', fecha: '2026-11-20', hora_inicio: '09:00' })).toBe('Ana Pérez tiene su cita programada (2026-11-20 09:00)')
  })

  it('is disabled when no Reverb key is configured', () => {
    expect(readRealtimeConfig({})).toBeNull()
    expect(readRealtimeConfig({ VITE_REVERB_APP_KEY: 'k', VITE_REVERB_HOST: '10.0.0.1', VITE_REVERB_PORT: '8085' })).toEqual({ key: 'k', host: '10.0.0.1', port: 8085, secure: false })
  })
})
