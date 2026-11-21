import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/authContext'
import type { UserRole } from '../auth/authService'
import { getActivities } from '../activities/activityService'
import { getAgendaMonth, getPendingRequests, type AgendaEntry } from '../agenda/agendaService'
import { getPatients } from '../patients/patientService'
import { getDashboardReport } from '../reports/reportService'
import { invalidateClinicalQueries, markClinicalQueriesStale } from '../../services/clinicalQuery'
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
  return <output data-testid="dashboard-location">{location.pathname}:{location.state?.dashboardAction ?? ''}</output>
}

describe('DashboardPage', () => {
  it.each([
    ['Citas programadas', '/citas-medicas'],
    ['Pacientes registrados', '/pacientes'],
    ['Saldo del mes', '/caja'],
    ['Actividades', '/actividades'],
  ])('navigates from the entire %s metric card to %s even when its value is zero', async (label, path) => {
    renderDashboard('doctora')
    const card = screen.getByRole('region', { name: label })
    expect(await within(card).findByText(label === 'Saldo del mes' ? '$0.00' : '0')).toBeInTheDocument()
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

    expect(await within(screen.getByRole('region', { name: 'Citas programadas' })).findByText('1')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Citas programadas' })).getByText('Para hoy · 1 completada')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Pacientes registrados' })).getByText('2')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Saldo del mes' })).getByText('$100.00')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Saldo del mes' })).getByText(/Ingresos: \$125.00/)).toHaveTextContent('Egresos: $25.00')
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
    expect(screen.getByRole('heading', { name: 'Bienvenido al consultorio' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Saldo del mes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Abrir Saldo del mes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Agenda de hoy' })).not.toBeInTheDocument()
    const quick = screen.getByRole('region', { name: 'Accesos rápidos' })
    expect(within(quick).getByRole('link', { name: 'Registrar paciente' })).toHaveAttribute('href', '/pacientes')
    expect(within(quick).queryByRole('link', { name: 'Registrar actividad' })).not.toBeInTheDocument()
    expect(within(quick).queryByRole('link', { name: 'Programar cita' })).not.toBeInTheDocument()
    expect(within(quick).queryByRole('link', { name: 'Registrar egreso' })).not.toBeInTheDocument()
  })

  it('places four permitted quick actions before pending requests with working routes', () => {
    renderDashboard('doctora')
    const quick = screen.getByRole('region', { name: 'Accesos rápidos' })
    const actions = within(quick).getAllByRole('link')
    expect(actions.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Registrar paciente', '/pacientes'],
      ['Programar cita', '/agenda'],
      ['Registrar actividad', '/actividades'],
      ['Registrar egreso', '/caja'],
    ])
    expect(quick.compareDocumentPosition(screen.getByRole('region', { name: 'Solicitudes pendientes' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it.each([
    ['Registrar paciente', '/pacientes'],
    ['Programar cita', '/agenda'],
    ['Registrar actividad', '/actividades'],
    ['Registrar egreso', '/caja'],
  ])('navigates from %s and requests its existing form', (label, path) => {
    renderDashboard('doctora')
    fireEvent.click(within(screen.getByRole('region', { name: 'Accesos rápidos' })).getByRole('link', { name: label }))
    expect(screen.getByTestId('dashboard-location')).toHaveTextContent(`${path}:${({ 'Registrar paciente': 'registrar-paciente', 'Programar cita': 'programar-cita', 'Registrar actividad': 'registrar-actividad', 'Registrar egreso': 'registrar-egreso' } as Record<string, string>)[label]}`)
  })

  it('keeps loading distinct from a real empty response', async () => {
    vi.mocked(getAgendaMonth).mockReturnValue(new Promise(() => {}))
    renderDashboard('doctora')
    expect(within(screen.getByRole('region', { name: 'Citas programadas' })).getByRole('status')).toHaveTextContent('Cargando')
    expect(within(screen.getByRole('region', { name: 'Agenda de hoy' })).getByRole('status')).toHaveTextContent('Cargando')
    expect(screen.getByRole('region', { name: 'Citas programadas' }).querySelectorAll('.dashboard-skeleton-line')).toHaveLength(3)
    expect(screen.getByRole('region', { name: 'Agenda de hoy' }).querySelectorAll('.dashboard-agenda-skeleton-row')).toHaveLength(2)
    expect(screen.queryByText('No hay citas médicas registradas para hoy.')).not.toBeInTheDocument()
  })

  it('shows empty states only after successful empty responses', async () => {
    renderDashboard('doctora')
    expect(await screen.findByText('No hay citas médicas registradas para hoy.')).toBeInTheDocument()
    expect(await screen.findByText('No hay solicitudes de citas pendientes.')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Citas programadas' })).getByText('0')).toBeInTheDocument()
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

  it('refreshes Laravel-backed cards and today agenda after related writes', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValue([appointment])
    vi.mocked(getDashboardReport).mockResolvedValue({ ...report, citas: { ...report.citas, hoy: 1 } })
    const view = render(<MemoryRouter><AuthContext.Provider value={{
      status: 'authenticated', user: { id: 'user-1', name: 'Personal', username: 'personal', role: 'doctora', paciente_id: null, activo: true },
      sessionError: null, login: async () => {}, logout: async () => {},
    }}><DashboardPage/></AuthContext.Provider></MemoryRouter>)
    expect(await screen.findByText('Paciente recibido')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Citas programadas' })).getByText('1')).toBeInTheDocument()
    view.unmount()

    vi.mocked(getAgendaMonth).mockResolvedValue([])
    vi.mocked(getDashboardReport).mockResolvedValue({ ...report, pacientes: { total: 2 }, mes_actual: { ingresos: '25.00', egresos: '5.00', saldo: '20.00' } })
    vi.mocked(getActivities).mockResolvedValue([activity])
    await Promise.all([markClinicalQueriesStale(['agenda']), markClinicalQueriesStale(['dashboard-report']), markClinicalQueriesStale(['activities'])])
    renderDashboard('doctora')
    expect(await screen.findByText('No hay citas médicas registradas para hoy.')).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Citas programadas' })).findByText('0')).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Pacientes registrados' })).findByText('2')).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Saldo del mes' })).findByText('$20.00')).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Actividades' })).findByText('1')).toBeInTheDocument()
  })

  it('shows a connection error when a populated pending list fails to refresh', async () => {
    vi.mocked(getPendingRequests).mockResolvedValueOnce([{ ...appointment, id: 'request-1', estado: 'pendiente' }]).mockRejectedValueOnce(new Error('offline'))
    renderDashboard('doctora')
    const panel = screen.getByRole('region', { name: 'Solicitudes pendientes' })
    expect(await within(panel).findByText('Paciente recibido')).toBeInTheDocument()
    await invalidateClinicalQueries(['agenda', 'pending'])
    expect(await within(panel).findByRole('alert')).toHaveTextContent('No fue posible actualizar las solicitudes.')
    expect(within(panel).getByText('Paciente recibido')).toBeInTheDocument()
  })

  it('animates a changed KPI from its last real value without introducing a zero', async () => {
    vi.mocked(getDashboardReport).mockResolvedValueOnce({ ...report, pacientes: { total: 5 } })
      .mockResolvedValueOnce({ ...report, pacientes: { total: 8 } })
    renderDashboard('doctora')
    const card = screen.getByRole('region', { name: 'Pacientes registrados' })
    expect(await within(card).findByText('5')).toBeInTheDocument()
    await invalidateClinicalQueries(['dashboard-report'])
    await waitFor(() => expect(getDashboardReport).toHaveBeenCalledTimes(2))
    expect(within(card).queryByText('0')).not.toBeInTheDocument()
    expect(await within(card).findByText('8')).toBeInTheDocument()
  })

  it('keeps the agenda ordered and unique while fading in changed entries', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValueOnce([appointment])
      .mockResolvedValueOnce([
        { ...appointment, id: 'appointment-2', hora_inicio: '08:00:00', paciente: { codigo_paciente: 'P-2', nombres: 'Otro paciente' } },
        { ...appointment, descripcion: 'Control actualizado' },
      ])
    renderDashboard('doctora')
    const agenda = screen.getByRole('region', { name: 'Agenda de hoy' })
    expect(await within(agenda).findByText('Paciente recibido')).toBeInTheDocument()
    const previousList = within(agenda).getByRole('list')
    await invalidateClinicalQueries(['agenda'])
    expect(await within(agenda).findByText('Control actualizado')).toBeInTheDocument()
    const rows = within(agenda).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Otro paciente')
    expect(rows[1]).toHaveTextContent('Paciente recibido')
    expect(within(agenda).getByRole('list')).not.toBe(previousList)
  })
})
