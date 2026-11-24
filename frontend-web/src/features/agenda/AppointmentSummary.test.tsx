import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppointmentSummary } from './AppointmentSummary'
import { getAppointmentSummary } from './agendaService'

vi.mock('./agendaService', () => ({ getAppointmentSummary: vi.fn() }))

beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('VITE_ENABLE_ACADEMIC_ORCHESTRATION', 'true') })
afterEach(() => vi.unstubAllEnvs())

describe('AppointmentSummary', () => {
  it('does not request academic summaries when the flag is absent', async () => {
    vi.stubEnv('VITE_ENABLE_ACADEMIC_ORCHESTRATION', '')
    render(<AppointmentSummary id="cita-1"/>)
    expect(await screen.findByText('La orquestación académica está deshabilitada.')).toBeInTheDocument()
    expect(getAppointmentSummary).not.toHaveBeenCalled()
  })

  it('hides the previous appointment immediately when the requested ID changes', async () => {
    let finishSecond!: (value: Awaited<ReturnType<typeof getAppointmentSummary>>) => void
    vi.mocked(getAppointmentSummary).mockImplementation((id) => id === 'cita-1'
      ? Promise.resolve({ cita: { id, fecha: '2026-10-05', hora_inicio: '10:00', hora_fin: '11:00', estado: 'programada', descripcion: null }, paciente: { codigo_paciente: '001', nombres: 'Paciente Uno' } })
      : new Promise((resolve) => { finishSecond = resolve }))
    const view = render(<AppointmentSummary id="cita-1"/>)
    expect(await screen.findByText('Paciente Uno')).toBeInTheDocument()

    view.rerender(<AppointmentSummary id="cita-2"/>)
    expect(screen.queryByText('Paciente Uno')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando resumen')

    await act(async () => { finishSecond({ cita: { id: 'cita-2', fecha: '2026-10-06', hora_inicio: '11:00', hora_fin: '12:00', estado: 'programada', descripcion: null }, paciente: { codigo_paciente: '002', nombres: 'Paciente Dos' } }) })
    expect(screen.getByText('Paciente Dos')).toBeInTheDocument()
    expect(screen.queryByText('Paciente Uno')).not.toBeInTheDocument()
  })

  it('shows verified appointment and patient fields only after a successful response', async () => {
    let finish!: (value: Awaited<ReturnType<typeof getAppointmentSummary>>) => void
    vi.mocked(getAppointmentSummary).mockReturnValue(new Promise((resolve) => { finish = resolve }))
    render(<AppointmentSummary id="cita-1"/>)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando resumen')
    expect(screen.queryByText('Paciente recibido')).not.toBeInTheDocument()
    finish({ cita: { id: 'cita-1', fecha: '2026-10-05', hora_inicio: '10:00', hora_fin: '11:00', estado: 'programada', descripcion: 'Control' }, paciente: { codigo_paciente: '001', nombres: 'Paciente recibido' } })
    expect(await screen.findByText('Paciente recibido')).toBeInTheDocument()
    expect(screen.getByText('Control')).toBeInTheDocument()
    expect(screen.getByText('001')).toBeInTheDocument()
  })

  it('shows an empty state without patient fields for a null response', async () => {
    vi.mocked(getAppointmentSummary).mockResolvedValue(null)
    render(<AppointmentSummary id="cita-1"/>)
    expect(await screen.findByText(/No hay información de resumen/)).toBeInTheDocument()
    expect(screen.queryByText('Paciente recibido')).not.toBeInTheDocument()
  })

  it.each([
    [401, /sesión/], [403, /permisos/], [404, /no se encontró|no está disponible/],
    [502, /no está disponible/], [503, /no está disponible/], [500, /error del servidor/],
  ])('shows a safe state for HTTP %i', async (status, message) => {
    vi.mocked(getAppointmentSummary).mockRejectedValue({ isAxiosError: true, response: { status } })
    render(<AppointmentSummary id="cita-1"/>)
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByText('Paciente recibido')).not.toBeInTheDocument()
  })

  it('reports a connection failure and retries without stale data', async () => {
    vi.mocked(getAppointmentSummary).mockRejectedValueOnce({ isAxiosError: true, request: {} }).mockResolvedValueOnce(null)
    render(<AppointmentSummary id="cita-1"/>)
    expect(await screen.findByRole('alert')).toHaveTextContent('conexión')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText(/No hay información de resumen/)).toBeInTheDocument()
    await waitFor(() => expect(getAppointmentSummary).toHaveBeenCalledTimes(2))
  })
})
