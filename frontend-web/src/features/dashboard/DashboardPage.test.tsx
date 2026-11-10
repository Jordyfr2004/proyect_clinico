import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/authContext'
import type { UserRole } from '../auth/authService'
import { getActivities } from '../activities/activityService'
import { getAgendaMonth, getPendingRequests, type AgendaEntry } from '../agenda/agendaService'
import { getPatients } from '../patients/patientService'
import { getDashboardReport } from '../reports/reportService'
import { DashboardPage } from './DashboardPage'

vi.mock('../agenda/agendaService', () => ({ getAgendaMonth: vi.fn(), getPendingRequests: vi.fn() }))
vi.mock('../patients/patientService', () => ({ getPatients: vi.fn() }))
vi.mock('../reports/reportService', () => ({ getDashboardReport: vi.fn() }))
vi.mock('../activities/activityService', () => ({ getActivities: vi.fn() }))

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const otherDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getDate() === 1 ? '02' : '01'}`
const appointment: AgendaEntry = {
  id: 'appointment-1', paciente_id: 'patient-1', fecha: today, hora_inicio: '10:00:00', hora_fin: '10:30:00',
  tipo: 'cita_medica', descripcion: 'Control recibido', estado: 'programada', diagnostico: null,
  tratamiento: null, observacion: null, paciente: { codigo_paciente: 'P-1', nombres: 'Paciente recibido' },
}
const patient = { id: 'patient-1', codigo_paciente: 'P-1', nombres: 'Paciente recibido', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: null }
const activity = { id: 'activity-1', paciente_id: 'patient-1', fecha: today, actividad: 'Actividad recibida', precio: '25.00', paciente: { codigo_paciente: 'P-1', nombres: 'Paciente recibido' } }
const pageOf = (data: typeof patient[]) => ({ data, current_page: 1, last_page: 1, per_page: 20, total: data.length, next_page_url: null, prev_page_url: null })
const report = { pacientes: { total: 0 }, citas: { hoy: 0, solicitudes_pendientes: 0 }, mes_actual: { ingresos: '0.00', egresos: '0.00', saldo: '0.00' } }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getAgendaMonth).mockResolvedValue([])
  vi.mocked(getPendingRequests).mockResolvedValue([])
  vi.mocked(getPatients).mockResolvedValue(pageOf([]))
  vi.mocked(getDashboardReport).mockResolvedValue(report)
  vi.mocked(getActivities).mockResolvedValue([])
})

function renderDashboard(role: UserRole) {
  render(<MemoryRouter><AuthContext.Provider value={{
    status: 'authenticated', user: { id: 'user-1', name: 'Personal', username: 'personal', role, paciente_id: null, activo: true },
    sessionError: null, login: async () => {}, logout: async () => {},
  }}><DashboardPage/><LocationProbe/></AuthContext.Provider></MemoryRouter>)
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="dashboard-location">{location.pathname}</output>
}

describe('DashboardPage', () => {
  it.each([
    ['Citas médicas', '/citas-medicas'],
    ['Pacientes registrados', '/pacientes'],
    ['Ingresos y egresos', '/caja'],
    ['Actividades', '/actividades'],
  ])('navigates from the entire %s metric card to %s even when its value is zero', async (label, path) => {
    renderDashboard('doctora')
    const card = screen.getByRole('region', { name: label })
    expect(await within(card).findByText(label === 'Ingresos y egresos' ? '$0.00' : '0')).toBeInTheDocument()
    const link = within(card).getByRole('link', { name: `Abrir ${label}` })
    expect(link).toHaveAttribute('href', path)
    fireEvent.click(link)
    expect(screen.getByTestId('dashboard-location')).toHaveTextContent(path)
  })

  it("uses confirmed services and only today's real medical appointments, ordered by time", async () => {
    vi.mocked(getAgendaMonth).mockResolvedValue([
      appointment,
      { ...appointment, id: 'appointment-2', hora_inicio: '08:00:00', estado: 'completada', paciente: { codigo_paciente: 'P-2', nombres: 'Otro paciente' } },
      { ...appointment, id: 'appointment-3', fecha: otherDay },
      { ...appointment, id: 'personal-1', tipo: 'personal' },
    ])
    vi.mocked(getPendingRequests).mockResolvedValue([{ ...appointment, id: 'request-1', fecha: null, hora_inicio: null, hora_fin: null, estado: 'pendiente' }])
    vi.mocked(getDashboardReport).mockResolvedValue({ pacientes: { total: 2 }, citas: { hoy: 1, solicitudes_pendientes: 1 }, mes_actual: { ingresos: '125.00', egresos: '25.00', saldo: '100.00' } })
    vi.mocked(getActivities).mockResolvedValue([activity, { ...activity, id: 'activity-2' }])
    renderDashboard('doctora')

    expect(await within(screen.getByRole('region', { name: 'Citas médicas' })).findByText('1')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Pacientes registrados' })).getByText('2')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Ingresos y egresos' })).getByText('$100.00')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Ingresos y egresos' })).getByText(/Ingresos: \$125.00/)).toHaveTextContent('Egresos: $25.00')
    expect(within(screen.getByRole('region', { name: 'Actividades' })).getByText('2')).toBeInTheDocument()
    const agenda = screen.getByRole('region', { name: 'Agenda de hoy' })
    const rows = within(agenda).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Otro paciente')
    expect(rows[1]).toHaveTextContent('Paciente recibido')
    expect(within(screen.getByRole('region', { name: 'Solicitudes pendientes' })).getByText('Paciente recibido')).toBeInTheDocument()
    expect(getAgendaMonth).toHaveBeenCalledWith(now.getMonth() + 1, now.getFullYear(), expect.any(AbortSignal))
    expect(getDashboardReport).toHaveBeenCalledTimes(1)
    expect(getPatients).not.toHaveBeenCalled()
    expect(getActivities).toHaveBeenCalledWith({ mes: now.getMonth() + 1, anio: now.getFullYear() }, expect.any(AbortSignal))
    expect(screen.getByRole('link', { name: /Ver agenda completa/ })).toHaveAttribute('href', '/agenda')
  })

  it('does not request or show agenda and financial information to an assistant', async () => {
    vi.mocked(getPatients).mockResolvedValue(pageOf([patient]))
    vi.mocked(getActivities).mockResolvedValue([activity])
    renderDashboard('asistente')
    expect(await within(screen.getByRole('region', { name: 'Pacientes registrados' })).findByText('1')).toBeInTheDocument()
    expect(getAgendaMonth).not.toHaveBeenCalled()
    expect(getPendingRequests).not.toHaveBeenCalled()
    expect(getDashboardReport).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Ingresos y egresos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Abrir Ingresos y egresos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Agenda de hoy' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Citas médicasConsulta y gestión/ })).not.toBeInTheDocument()
  })

  it('keeps loading distinct from a real empty response', async () => {
    vi.mocked(getAgendaMonth).mockReturnValue(new Promise(() => {}))
    renderDashboard('doctora')
    expect(within(screen.getByRole('region', { name: 'Citas médicas' })).getByRole('status')).toHaveTextContent('Cargando')
    expect(within(screen.getByRole('region', { name: 'Agenda de hoy' })).getByRole('status')).toHaveTextContent('Cargando')
    expect(screen.queryByText('No hay citas médicas registradas para hoy.')).not.toBeInTheDocument()
  })

  it('shows empty states only after successful empty responses', async () => {
    renderDashboard('doctora')
    expect(await screen.findByText('No hay citas médicas registradas para hoy.')).toBeInTheDocument()
    expect(await screen.findByText('No hay solicitudes de citas pendientes.')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Citas médicas' })).getByText('0')).toBeInTheDocument()
  })

  it('shows a safe error and retries a failed request', async () => {
    vi.mocked(getDashboardReport).mockRejectedValueOnce(new Error('internal detail')).mockResolvedValueOnce({ ...report, pacientes: { total: 1 } })
    renderDashboard('doctora')
    const card = screen.getByRole('region', { name: 'Pacientes registrados' })
    expect(await within(card).findByRole('alert')).toHaveTextContent('No fue posible cargar esta información.')
    expect(card).not.toHaveTextContent('internal detail')
    fireEvent.click(within(card).getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(within(card).getByText('1')).toBeInTheDocument())
    expect(getDashboardReport).toHaveBeenCalledTimes(2)
  })

  it('retries only the failed resource without repeating successful dashboard requests', async () => {
    vi.mocked(getActivities).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([activity])
    renderDashboard('doctora')
    const card = screen.getByRole('region', { name: 'Actividades' })
    expect(await within(card).findByRole('alert')).toBeInTheDocument()
    await screen.findByText('No hay citas médicas registradas para hoy.')
    fireEvent.click(within(card).getByRole('button', { name: 'Reintentar' }))
    expect(await within(card).findByText('1')).toBeInTheDocument()
    expect(getActivities).toHaveBeenCalledTimes(2)
    expect(getAgendaMonth).toHaveBeenCalledTimes(1)
    expect(getPendingRequests).toHaveBeenCalledTimes(1)
    expect(getDashboardReport).toHaveBeenCalledTimes(1)
  })
})
