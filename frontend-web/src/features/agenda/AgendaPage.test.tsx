import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AgendaPage } from './AgendaPage'
import { createMedicalAppointment, createPersonalEntry, getAgendaMonth, getPendingRequests, updateAgendaEntry } from './agendaService'
import { AuthContext } from '../auth/authContext'
import { getPatients } from '../patients/patientService'
import type { UserRole } from '../auth/authService'
import * as clinicalQuery from '../../services/clinicalQuery'

vi.mock('./agendaService', () => ({ getAgendaMonth: vi.fn(), getPendingRequests: vi.fn(), createMedicalAppointment: vi.fn(), createPersonalEntry: vi.fn(), updateAgendaEntry: vi.fn() }))
vi.mock('../patients/patientService', () => ({ getPatients: vi.fn() }))
const personal = { id: 'personal-1', paciente_id: null, fecha: '2026-10-05', hora_inicio: '10:00', hora_fin: '11:00', tipo: 'personal' as const, descripcion: 'Reunión', estado: null, diagnostico: null, tratamiento: null, observacion: null, paciente: null }
const medical = { ...personal, id: 'medical-1', tipo: 'cita_medica' as const, estado: 'programada' as const, descripcion: 'Control recibido', paciente_id: 'patient-1', paciente: { codigo_paciente: '001', nombres: 'Paciente recibido' } }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getAgendaMonth).mockResolvedValue([personal, medical]); vi.mocked(getPatients).mockResolvedValue({ data: [{ id: 'patient-1', codigo_paciente: '001', nombres: 'Paciente recibido', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: null }], current_page: 1, last_page: 1, per_page: 20, total: 1, next_page_url: null, prev_page_url: null }) })

function renderAgenda(role: UserRole = 'doctora', dashboardAction?: string) {
  render(<AuthContext.Provider value={{ status: 'authenticated', user: { id: 'staff-1', name: 'Personal', username: 'personal', role, paciente_id: null, activo: true }, sessionError: null, login: async () => {}, logout: async () => {} }}><MemoryRouter initialEntries={[{ pathname: '/agenda', state: dashboardAction ? { dashboardAction } : null }]}><AgendaPage/></MemoryRouter></AuthContext.Provider>)
}

function selectOctober() {
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar año y mes' }))
  const year = new Date().getFullYear()
  const page = Math.floor(year / 12) * 12
  for (let current = page; current > 2026; current -= 12) fireEvent.click(screen.getByRole('button', { name: 'Años anteriores' }))
  for (let current = page; current + 11 < 2026; current += 12) fireEvent.click(screen.getByRole('button', { name: 'Años siguientes' }))
  fireEvent.click(screen.getByRole('button', { name: '2026' }))
  fireEvent.click(screen.getByRole('button', { name: 'octubre' }))
}

async function choosePatient(form: HTMLElement, search = 'Paciente', option = /Paciente recibido.*001/) {
  fireEvent.change(within(form).getByRole('combobox', { name: 'Buscar paciente' }), { target: { value: search } })
  fireEvent.click(await within(form).findByRole('option', { name: option }))
}

describe('AgendaPage consultation', () => {
  it('invalidates the Dashboard total after editing a medical appointment', async () => {
    const stale = vi.spyOn(clinicalQuery, 'markClinicalQueriesStale')
    vi.mocked(updateAgendaEntry).mockResolvedValue('Cita actualizada')
    renderAgenda()
    selectOctober()
    const bookings = screen.getByRole('region', { name: 'Registros agendados' })
    expect(await within(bookings).findByText('Control recibido')).toBeInTheDocument()
    fireEvent.click(within(bookings).getByRole('button', { name: /Más opciones para Control recibido/ }))
    fireEvent.click(within(bookings).getByRole('button', { name: 'Editar' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Editar registro de agenda' }))
    await waitFor(() => expect(updateAgendaEntry).toHaveBeenCalledOnce())
    expect(stale).toHaveBeenCalledWith(['dashboard-report'])
    stale.mockRestore()
  })

  it('opens a medical appointment for today from the Dashboard action', async () => {
    renderAgenda('doctora', 'programar-cita')
    const form = await screen.findByRole('form', { name: 'Agendar cita médica' })
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    expect(within(form).getByText(new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${today}T12:00:00`)))).toBeInTheDocument()
  })

  it('ignores a booking action for an assistant', async () => {
    renderAgenda('asistente', 'programar-cita')
    expect(await screen.findByRole('heading', { name: 'Registros del mes' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('lists booked entries for the month and opens booking directly from a calendar day', async () => {
    renderAgenda()
    selectOctober()
    const bookings = screen.getByRole('region', { name: 'Registros agendados' })
    expect(await within(bookings).findByText('Control recibido')).toBeInTheDocument()
    expect(bookings).toHaveTextContent('Reunión')
    expect(bookings).toHaveTextContent('5 de octubre de 2026')
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    expect(screen.getByRole('dialog', { name: 'Agendar cita médica' })).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Agendar cita médica' })).toHaveTextContent('5 de octubre de 2026')
  })

  it('keeps patient results closed on initial focus and opens them only on request', async () => {
    renderAgenda()
    selectOctober()
    const calendar = screen.getByRole('region', { name: 'Calendario de octubre de 2026' })
    expect(within(calendar).getByRole('button', { name: 'Mes anterior' })).toBeInTheDocument()
    expect(within(calendar).getByRole('button', { name: 'Seleccionar año y mes' })).toHaveTextContent('octubre de 2026')
    fireEvent.click(within(calendar).getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    const form = screen.getByRole('form', { name: 'Agendar cita médica' })
    const search = within(form).getByRole('combobox', { name: 'Buscar paciente' })
    expect(search).toHaveFocus()
    expect(search).toHaveAttribute('aria-expanded', 'false')
    expect(getPatients).not.toHaveBeenCalled()
    expect(within(form).queryByRole('listbox')).not.toBeInTheDocument()
    fireEvent.click(within(form).getByRole('button', { name: 'Desplegar pacientes' }))
    expect(search).toHaveAttribute('aria-expanded', 'true')
    expect(await within(form).findByRole('option', { name: /Paciente recibido.*001/ })).toBeInTheDocument()
    expect(within(form).getByRole('button', { name: 'Guardar cita' })).toBeInTheDocument()
    expect(within(form).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('places the edit date above the paired time fields', async () => {
    renderAgenda()
    selectOctober()
    const bookings = screen.getByRole('region', { name: 'Registros agendados' })
    fireEvent.click(await within(bookings).findByRole('button', { name: /Más opciones para Control recibido/ }))
    fireEvent.click(within(bookings).getByRole('button', { name: 'Editar' }))
    const form = screen.getByRole('form', { name: 'Editar registro de agenda' })
    expect(within(form).getByLabelText('Fecha').closest('label')).toHaveClass('sm:col-span-2')
    expect(within(form).getByLabelText('Hora de inicio')).toHaveValue('10:00')
    expect(within(form).getByLabelText('Hora de fin')).toHaveValue('11:00')
  })

  it('orders the monthly list by date and excludes entries outside the selected month', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValue([
      { ...personal, id: 'later', fecha: '2026-10-20', descripcion: 'Reunión posterior' },
      medical,
      { ...personal, id: 'next-month', fecha: '2026-11-01', descripcion: 'Fuera del mes' },
    ])
    renderAgenda()
    selectOctober()
    const bookings = screen.getByRole('region', { name: 'Registros agendados' })
    expect(await within(bookings).findByText('2 registros agendados')).toBeInTheDocument()
    const rows = within(bookings).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Control recibido')
    expect(rows[1]).toHaveTextContent('Reunión posterior')
    expect(within(bookings).getAllByRole('heading', { level: 3 })).toHaveLength(2)
    expect(within(bookings).getByRole('heading', { level: 3, name: '5 de octubre de 2026' })).toBeInTheDocument()
    expect(within(bookings).getByRole('heading', { level: 3, name: '20 de octubre de 2026' })).toBeInTheDocument()
    expect(bookings).toHaveClass('xl:h-[var(--agenda-panel-height)]')
    expect(within(bookings).getByRole('region', { name: 'Lista de registros del mes' })).toHaveClass('xl:overflow-y-auto')
    expect(within(bookings).getByRole('region', { name: 'Lista de registros del mes' })).toHaveAttribute('tabindex', '0')
    expect(bookings).not.toHaveTextContent('Fuera del mes')
  })

  it('selects a year, then a month, then shows the day grid without changing the booking flow', async () => {
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar año y mes' }))
    const calendar = screen.getByRole('region', { name: 'Calendario de octubre de 2026' })
    expect(within(calendar).getByLabelText('Seleccionar año')).toBeInTheDocument()
    fireEvent.click(within(calendar).getByRole('button', { name: '2027' }))
    expect(within(calendar).getByLabelText('Seleccionar mes')).toBeInTheDocument()
    fireEvent.click(within(calendar).getByRole('button', { name: 'marzo' }))
    expect(screen.getByRole('button', { name: /Seleccionar 1 de marzo de 2027/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Seleccionar año y mes' })).toHaveTextContent('marzo de 2027')
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledWith(3, 2027, expect.any(AbortSignal)))
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 1 de marzo de 2027/ }))
    expect(screen.getByRole('dialog', { name: 'Agendar cita médica' })).toBeInTheDocument()
  })

  it('uses one visual date picker from the icon and title, with four borderless columns', () => {
    renderAgenda()
    selectOctober()
    const calendar = screen.getByRole('region', { name: 'Calendario de octubre de 2026' })
    expect(within(calendar).queryByRole('textbox', { name: 'Mes' })).not.toBeInTheDocument()
    expect(calendar.querySelector('input[type="month"]')).toBeNull()
    fireEvent.click(within(calendar).getByRole('button', { name: 'Abrir selector de año, mes y día' }))
    const years = within(calendar).getByLabelText('Seleccionar año')
    expect(years.querySelector('.grid-cols-4')).toBeInTheDocument()
    expect(within(years).getByRole('button', { name: '2026' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(years).getByRole('button', { name: '2026' }))
    const months = within(calendar).getByLabelText('Seleccionar mes')
    expect(months.querySelector('.grid-cols-4')).toBeInTheDocument()
    expect(within(months).getByRole('button', { name: 'octubre' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(months).getByRole('button', { name: 'octubre' }))
    expect(within(calendar).getByRole('button', { name: /Seleccionar 5 de octubre/ })).toBeInTheDocument()
    fireEvent.click(within(calendar).getByRole('button', { name: 'Seleccionar año y mes' }))
    expect(within(calendar).getByLabelText('Seleccionar año')).toBeInTheDocument()
  })

  it('explains record dots and returns to the current day without opening a booking', () => {
    renderAgenda()
    selectOctober()
    expect(screen.getByText('Día con registros')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ir a hoy' }))
    const today = new Date()
    const label = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' }).format(today)
    expect(screen.getByRole('button', { name: 'Seleccionar año y mes' })).toHaveTextContent(label)
    expect(screen.getByRole('button', { name: new RegExp(`Seleccionar ${today.getDate()} de ${label}`) })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('creates a personal entry without patient data and refreshes the calendar', async () => {
    vi.mocked(createPersonalEntry).mockResolvedValue('Actividad personal registrada.')
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Actividad personal' }))
    const form = screen.getByRole('form', { name: 'Agendar actividad personal' })
    expect(within(form).queryByRole('combobox', { name: 'Buscar paciente' })).not.toBeInTheDocument()
    fireEvent.change(within(form).getByLabelText('Hora de inicio'), { target: { value: '09:00' } })
    fireEvent.change(within(form).getByLabelText('Hora de fin'), { target: { value: '10:00' } })
    fireEvent.submit(form)
    expect(await within(form).findByRole('alert')).toHaveTextContent('La descripción es obligatoria')
    fireEvent.change(within(form).getByLabelText('Descripción'), { target: { value: 'Reunión de trabajo' } })
    fireEvent.submit(form)
    fireEvent.submit(form)
    await waitFor(() => expect(createPersonalEntry).toHaveBeenCalledExactlyOnceWith({ fecha: '2026-10-05', hora_inicio: '09:00', hora_fin: '10:00', descripcion: 'Reunión de trabajo' }))
    expect(createMedicalAppointment).not.toHaveBeenCalled()
    expect(await screen.findByText('Actividad personal registrada correctamente.')).toBeInTheDocument()
  })

  it('selects a searched patient and sends only its code for a medical appointment', async () => {
    vi.mocked(createMedicalAppointment).mockResolvedValue('Cita registrada')
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    const form = screen.getByRole('form', { name: 'Agendar cita médica' })
    fireEvent.change(within(form).getByRole('combobox', { name: 'Buscar paciente' }), { target: { value: 'Paciente' } })
    await waitFor(() => expect(getPatients).toHaveBeenCalledWith({ buscar: 'Paciente', page: 1 }, expect.any(AbortSignal)))
    fireEvent.click(await within(form).findByRole('option', { name: /Paciente recibido.*001/ }))
    expect(within(form).getByRole('status')).toHaveTextContent('Paciente seleccionado: Paciente recibido · Código: 001')
    fireEvent.change(within(form).getByLabelText('Hora de inicio'), { target: { value: '09:00' } })
    fireEvent.change(within(form).getByLabelText('Hora de fin'), { target: { value: '10:00' } })
    fireEvent.submit(form)
    await waitFor(() => expect(createMedicalAppointment).toHaveBeenCalledExactlyOnceWith({ codigo_paciente: '001', fecha: '2026-10-05', hora_inicio: '09:00', hora_fin: '10:00', descripcion: null }))
  })

  it('requires a new visible patient selection after changing the entry type', async () => {
    const first = { id: 'patient-1', codigo_paciente: '001', nombres: 'Paciente anterior', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: null }
    const second = { ...first, id: 'patient-2', codigo_paciente: '002', nombres: 'Paciente nuevo' }
    vi.mocked(getPatients).mockImplementation(async (params) => ({
      data: params?.buscar === 'Nuevo' ? [second] : [first],
      current_page: 1, last_page: 1, per_page: 20, total: 1, next_page_url: null, prev_page_url: null,
    }))
    vi.mocked(createMedicalAppointment).mockResolvedValue('Cita registrada')
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    await choosePatient(screen.getByRole('form', { name: 'Agendar cita médica' }), 'Anterior', /Paciente anterior.*001/)
    expect(screen.getByRole('status')).toHaveTextContent('Paciente seleccionado: Paciente anterior · Código: 001')
    fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('Descripción (opcional)'), { target: { value: 'Control' } })

    fireEvent.click(screen.getByRole('button', { name: 'Actividad personal' }))
    expect(screen.queryByRole('combobox', { name: 'Buscar paciente' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cita médica' }))
    const form = screen.getByRole('form', { name: 'Agendar cita médica' })
    const search = within(form).getByRole('combobox', { name: 'Buscar paciente' })
    expect(search).toHaveValue('')
    expect(within(form).queryByText(/Paciente seleccionado:/)).not.toBeInTheDocument()
    expect(within(form).getByLabelText('Hora de inicio')).toHaveValue('09:00')
    expect(within(form).getByLabelText('Hora de fin')).toHaveValue('10:00')
    expect(within(form).getByLabelText('Descripción (opcional)')).toHaveValue('Control')
    fireEvent.submit(form)
    expect(await within(form).findByRole('alert')).toHaveTextContent('Selecciona un paciente')
    expect(createMedicalAppointment).not.toHaveBeenCalled()

    await choosePatient(form, 'Nuevo', /Paciente nuevo.*002/)
    fireEvent.submit(form)
    await waitFor(() => expect(createMedicalAppointment).toHaveBeenCalledExactlyOnceWith({ codigo_paciente: '002', fecha: '2026-10-05', hora_inicio: '09:00', hora_fin: '10:00', descripcion: 'Control' }))
    expect(createPersonalEntry).not.toHaveBeenCalled()
  })

  it('finds by code with Enter and invalidates the selection when the text changes', async () => {
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    const form = screen.getByRole('form', { name: 'Agendar cita médica' })
    const search = within(form).getByRole('combobox', { name: 'Buscar paciente' })
    fireEvent.change(search, { target: { value: '001' } })
    await waitFor(() => expect(getPatients).toHaveBeenCalledWith({ buscar: '001', page: 1 }, expect.any(AbortSignal)))
    await within(form).findByRole('option', { name: /Paciente recibido.*001/ })
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(within(form).getByRole('status')).toHaveTextContent('Paciente seleccionado: Paciente recibido · Código: 001')
    fireEvent.change(search, { target: { value: 'Otro paciente' } })
    expect(within(form).queryByText(/Paciente seleccionado:/)).not.toBeInTheDocument()
    fireEvent.change(within(form).getByLabelText('Hora de inicio'), { target: { value: '09:00' } })
    fireEvent.change(within(form).getByLabelText('Hora de fin'), { target: { value: '10:00' } })
    fireEvent.submit(form)
    expect(await within(form).findByRole('alert')).toHaveTextContent('Selecciona un paciente')
    expect(createMedicalAppointment).not.toHaveBeenCalled()
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(search).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('dialog', { name: 'Agendar cita médica' })).toBeInTheDocument()
  })

  it('abandons obsolete patient searches and does not show their results', async () => {
    const signals: Array<{ term: string | undefined; signal: AbortSignal }> = []
    let finishOld!: (value: Awaited<ReturnType<typeof getPatients>>) => void
    vi.mocked(getPatients).mockImplementation((params, signal) => {
      signals.push({ term: params?.buscar, signal: signal! })
      if (params?.buscar === 'viejo') return new Promise((resolve) => { finishOld = resolve })
      return Promise.resolve({ data: [], current_page: 1, last_page: 1, per_page: 20, total: 0, next_page_url: null, prev_page_url: null })
    })
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    const search = screen.getByRole('combobox', { name: 'Buscar paciente' })
    fireEvent.change(search, { target: { value: 'viejo' } })
    await waitFor(() => expect(getPatients).toHaveBeenCalledWith({ buscar: 'viejo', page: 1 }, expect.any(AbortSignal)))
    fireEvent.change(search, { target: { value: 'nuevo' } })
    await waitFor(() => expect(getPatients).toHaveBeenCalledWith({ buscar: 'nuevo', page: 1 }, expect.any(AbortSignal)))
    expect(signals.find((request) => request.term === 'viejo')?.signal.aborted).toBe(true)
    finishOld({ data: [{ id: 'old', codigo_paciente: '099', nombres: 'Resultado viejo', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: null }], current_page: 1, last_page: 1, per_page: 20, total: 1, next_page_url: null, prev_page_url: null })
    expect(await screen.findByText('Sin coincidencias. Prueba otro nombre o código.')).toBeInTheDocument()
    expect(screen.queryByText('Resultado viejo')).not.toBeInTheDocument()
  })

  it('retries a failed search and selects the right patient among similar names', async () => {
    const matchingPatients = {
      data: [
        { id: 'one', codigo_paciente: '001', nombres: 'María Uno', cedula: '0911111111', telefono: null, direccion: null, fecha_nacimiento: null },
        { id: 'two', codigo_paciente: '002', nombres: 'María Dos', cedula: '0922222222', telefono: null, direccion: null, fecha_nacimiento: null },
      ], current_page: 1, last_page: 2, per_page: 20, total: 21, next_page_url: '/pacientes?page=2', prev_page_url: null,
    }
    let searchAttempts = 0
    vi.mocked(getPatients).mockImplementation((params) => {
      if (params?.buscar === 'María') return ++searchAttempts === 1 ? Promise.reject(new Error('network')) : Promise.resolve(matchingPatients)
      return Promise.resolve({ data: [], current_page: 1, last_page: 1, per_page: 20, total: 0, next_page_url: null, prev_page_url: null })
    })
    vi.mocked(createMedicalAppointment).mockResolvedValue('Cita registrada')
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    const form = screen.getByRole('form', { name: 'Agendar cita médica' })
    const search = within(form).getByRole('combobox', { name: 'Buscar paciente' })
    fireEvent.click(within(form).getByRole('button', { name: 'Desplegar pacientes' }))
    await waitFor(() => expect(getPatients).toHaveBeenCalledWith({ page: 1 }, expect.any(AbortSignal)))
    fireEvent.change(search, { target: { value: 'María' } })
    expect(await within(form).findByRole('alert')).toHaveTextContent('No fue posible buscar pacientes')
    fireEvent.click(within(form).getByRole('button', { name: 'Reintentar' }))
    expect(await within(form).findByRole('option', { name: /María Dos.*002/ })).toBeInTheDocument()
    expect(within(form).getByText(/Se muestra la primera página/)).toBeInTheDocument()
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(within(form).getByRole('status')).toHaveTextContent('María Dos · Código: 002')
    fireEvent.change(within(form).getByLabelText('Hora de inicio'), { target: { value: '09:00' } })
    fireEvent.change(within(form).getByLabelText('Hora de fin'), { target: { value: '10:00' } })
    fireEvent.submit(form)
    await waitFor(() => expect(createMedicalAppointment).toHaveBeenCalledWith(expect.objectContaining({ codigo_paciente: '002' })))
  })

  it('keeps a long result list scrollable and scrolls the keyboard-active option into view', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
    try {
      const matchingPatients = {
        data: Array.from({ length: 20 }, (_, index) => ({ id: `patient-${index}`, codigo_paciente: `P${index}`, nombres: `Paciente ${index}`, cedula: `09000000${String(index).padStart(2, '0')}`, telefono: null, direccion: null, fecha_nacimiento: null })),
        current_page: 1, last_page: 1, per_page: 20, total: 20, next_page_url: null, prev_page_url: null,
      }
      vi.mocked(getPatients).mockImplementation((params) => Promise.resolve(params?.buscar === 'Paciente' ? matchingPatients : { data: [], current_page: 1, last_page: 1, per_page: 20, total: 0, next_page_url: null, prev_page_url: null }))
      renderAgenda()
      selectOctober()
      fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
        const search = screen.getByRole('combobox', { name: 'Buscar paciente' })
      fireEvent.change(search, { target: { value: 'Paciente' } })
      const list = await screen.findByRole('listbox')
      expect(await within(list).findAllByRole('option')).toHaveLength(20)
      expect(list).toHaveClass('max-h-44', 'overflow-y-auto', 'overflow-x-hidden')
      for (let index = 0; index < 12; index += 1) fireEvent.keyDown(search, { key: 'ArrowDown' })
      const activeOption = within(list).getByRole('option', { name: /Paciente 12.*P12/ })
      expect(activeOption).toHaveAttribute('aria-selected', 'true')
      expect(search).toHaveAttribute('aria-activedescendant', activeOption.id)
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
      expect(scrollIntoView.mock.contexts.at(-1)).toBe(activeOption)
      fireEvent.keyDown(search, { key: 'ArrowUp' })
      expect(within(list).getByRole('option', { name: /Paciente 11.*P11/ })).toHaveAttribute('aria-selected', 'true')
      fireEvent.keyDown(search, { key: 'Escape' })
      expect(search).toHaveAttribute('aria-expanded', 'false')
    } finally {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', descriptor)
      else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
    }
  })
  it('shows only backend records in the monthly list', async () => {
    renderAgenda()
    selectOctober()
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledWith(10, 2026, expect.any(AbortSignal)))
    const bookings = screen.getByRole('region', { name: 'Registros agendados' })
    expect(await within(bookings).findByText('2 registros agendados')).toBeInTheDocument()
    expect(bookings).toHaveTextContent('Reunión')
    expect(bookings).toHaveTextContent('Control recibido')
    expect(bookings).toHaveTextContent('Paciente recibido')
    expect(bookings).toHaveTextContent('10:00 – 11:00')
    expect(within(bookings).getByLabelText('Estado: programada')).toHaveTextContent('programada')
    expect(within(bookings).getAllByRole('heading', { level: 3, name: '5 de octubre de 2026' })).toHaveLength(1)
    expect(within(bookings).getByText('2 registros')).toBeInTheDocument()
    expect(getPendingRequests).not.toHaveBeenCalled()
    expect(createMedicalAppointment).not.toHaveBeenCalled()
    expect(createPersonalEntry).not.toHaveBeenCalled()
    expect(updateAgendaEntry).not.toHaveBeenCalled()
  })

  it('clears visual selection when moving to another month', async () => {
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    expect(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }))
    expect(screen.getByRole('button', { name: /Seleccionar 1 de noviembre/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Seleccionar año y mes' })).toHaveTextContent('noviembre de 2026')
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledWith(11, 2026, expect.any(AbortSignal)))
  })

  it('keeps an honest empty month and retryable load error', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('No disponible')).mockResolvedValueOnce([])
    renderAgenda()
    selectOctober()
    expect(await screen.findByText('No hay registros agendados para este mes.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible cargar la agenda.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledTimes(3))
  })

  it('creates a medical appointment on the selected day using a real patient code, then reloads Agenda', async () => {
    vi.mocked(createMedicalAppointment).mockResolvedValue('Cita registrada')
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    const form = screen.getByRole('form', { name: 'Agendar cita médica' })
    expect(form).toHaveTextContent('5 de octubre de 2026')
    await choosePatient(form)
    fireEvent.change(within(form).getByLabelText('Hora de inicio'), { target: { value: '09:00' } })
    fireEvent.change(within(form).getByLabelText('Hora de fin'), { target: { value: '10:00' } })
    fireEvent.submit(form)
    fireEvent.submit(form)
    await waitFor(() => expect(createMedicalAppointment).toHaveBeenCalledExactlyOnceWith({ codigo_paciente: '001', fecha: '2026-10-05', hora_inicio: '09:00', hora_fin: '10:00', descripcion: null }))
    expect(await screen.findByText('Cita médica registrada correctamente.')).toBeInTheDocument()
    expect(vi.mocked(getAgendaMonth).mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('does not offer appointment creation to an assistant', async () => {
    renderAgenda('asistente')
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    expect(await within(screen.getByRole('region', { name: 'Registros agendados' })).findByText('2 registros agendados')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each([[409, 'Horario ocupado.'], [422, 'El código de paciente no existe.']] as const)('shows backend %s and keeps the appointment form open', async (status, message) => {
    vi.mocked(createMedicalAppointment).mockRejectedValue({ isAxiosError: true, response: { status, data: { message } } })
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    const form = screen.getByRole('form', { name: 'Agendar cita médica' })
    await choosePatient(form)
    fireEvent.change(within(form).getByLabelText('Hora de inicio'), { target: { value: '09:00' } })
    fireEvent.change(within(form).getByLabelText('Hora de fin'), { target: { value: '10:00' } })
    fireEvent.submit(form)
    expect(await within(form).findByRole('alert')).toHaveTextContent(message)
    expect(createMedicalAppointment).toHaveBeenCalledOnce()
    expect(form).toBeInTheDocument()
  })

  it('does not claim success when the network cannot confirm the appointment', async () => {
    vi.mocked(createMedicalAppointment).mockRejectedValue({ isAxiosError: true })
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    const form = screen.getByRole('form', { name: 'Agendar cita médica' })
    await choosePatient(form)
    fireEvent.change(within(form).getByLabelText('Hora de inicio'), { target: { value: '09:00' } })
    fireEvent.change(within(form).getByLabelText('Hora de fin'), { target: { value: '10:00' } })
    fireEvent.submit(form)
    expect(await within(form).findByRole('alert')).toHaveTextContent('No fue posible confirmar si el registro se guardó')
    expect(screen.queryByText('Cita médica registrada correctamente.')).not.toBeInTheDocument()
    expect(createMedicalAppointment).toHaveBeenCalledExactlyOnceWith({ codigo_paciente: '001', fecha: '2026-10-05', hora_inicio: '09:00', hora_fin: '10:00', descripcion: null })
  })

  it('reports a confirmed booking when the calendar reload fails', async () => {
    vi.mocked(createMedicalAppointment).mockResolvedValue('Cita registrada')
    vi.mocked(getAgendaMonth).mockResolvedValueOnce([personal, medical]).mockRejectedValueOnce(new Error('network'))
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    const form = screen.getByRole('form', { name: 'Agendar cita médica' })
    await choosePatient(form)
    fireEvent.change(within(form).getByLabelText('Hora de inicio'), { target: { value: '09:00' } })
    fireEvent.change(within(form).getByLabelText('Hora de fin'), { target: { value: '10:00' } })
    fireEvent.submit(form)
    expect(await screen.findByText(/La cita se registró, pero no fue posible actualizar el calendario/)).toBeInTheDocument()
    expect(createMedicalAppointment).toHaveBeenCalledOnce()
  })
})
