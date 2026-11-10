import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgendaPage } from './AgendaPage'
import { createMedicalAppointment, createPersonalEntry, getAgendaMonth, getPendingRequests, updateAgendaEntry } from './agendaService'
import { AuthContext } from '../auth/authContext'
import { getPatients } from '../patients/patientService'
import type { UserRole } from '../auth/authService'

vi.mock('./agendaService', () => ({ getAgendaMonth: vi.fn(), getPendingRequests: vi.fn(), createMedicalAppointment: vi.fn(), createPersonalEntry: vi.fn(), updateAgendaEntry: vi.fn() }))
vi.mock('../patients/patientService', () => ({ getPatients: vi.fn() }))
const personal = { id: 'personal-1', paciente_id: null, fecha: '2026-10-05', hora_inicio: '10:00', hora_fin: '11:00', tipo: 'personal' as const, descripcion: 'Reunión', estado: null, diagnostico: null, tratamiento: null, observacion: null, paciente: null }
const medical = { ...personal, id: 'medical-1', tipo: 'cita_medica' as const, estado: 'programada' as const, descripcion: 'Control recibido', paciente_id: 'patient-1', paciente: { codigo_paciente: '001', nombres: 'Paciente recibido' } }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getAgendaMonth).mockResolvedValue([personal, medical]); vi.mocked(getPatients).mockResolvedValue({ data: [{ id: 'patient-1', codigo_paciente: '001', nombres: 'Paciente recibido', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: null }], current_page: 1, last_page: 1, per_page: 20, total: 1, next_page_url: null, prev_page_url: null }) })

function renderAgenda(role: UserRole = 'doctora') {
  render(<AuthContext.Provider value={{ status: 'authenticated', user: { id: 'staff-1', name: 'Personal', username: 'personal', role, paciente_id: null, activo: true }, sessionError: null, login: async () => {}, logout: async () => {} }}><AgendaPage/></AuthContext.Provider>)
}

function selectOctober() {
  fireEvent.change(screen.getByLabelText('Mes'), { target: { value: '2026-10' } })
}

async function choosePatient(form: HTMLElement, search = 'Paciente') {
  fireEvent.change(within(form).getByRole('combobox', { name: 'Buscar paciente' }), { target: { value: search } })
  fireEvent.click(await within(form).findByRole('option', { name: /Paciente recibido.*001/ }))
}

describe('AgendaPage consultation', () => {
  it('creates a personal entry without patient data and refreshes the calendar', async () => {
    vi.mocked(createPersonalEntry).mockResolvedValue('Actividad personal registrada.')
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Agendar' }))
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
    fireEvent.click(await screen.findByRole('button', { name: 'Agendar' }))
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

  it('finds by code with Enter and invalidates the selection when the text changes', async () => {
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Agendar' }))
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
    const signals: AbortSignal[] = []
    let finishOld!: (value: Awaited<ReturnType<typeof getPatients>>) => void
    vi.mocked(getPatients).mockImplementation((params, signal) => {
      signals.push(signal!)
      if (params?.buscar === 'viejo') return new Promise((resolve) => { finishOld = resolve })
      return Promise.resolve({ data: [], current_page: 1, last_page: 1, per_page: 20, total: 0, next_page_url: null, prev_page_url: null })
    })
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Agendar' }))
    const search = screen.getByRole('combobox', { name: 'Buscar paciente' })
    fireEvent.change(search, { target: { value: 'viejo' } })
    await waitFor(() => expect(getPatients).toHaveBeenCalledWith({ buscar: 'viejo', page: 1 }, expect.any(AbortSignal)))
    fireEvent.change(search, { target: { value: 'nuevo' } })
    await waitFor(() => expect(getPatients).toHaveBeenCalledWith({ buscar: 'nuevo', page: 1 }, expect.any(AbortSignal)))
    expect(signals[0].aborted).toBe(true)
    finishOld({ data: [{ id: 'old', codigo_paciente: '099', nombres: 'Resultado viejo', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: null }], current_page: 1, last_page: 1, per_page: 20, total: 1, next_page_url: null, prev_page_url: null })
    expect(await screen.findByText('Sin coincidencias. Prueba otro nombre o código.')).toBeInTheDocument()
    expect(screen.queryByText('Resultado viejo')).not.toBeInTheDocument()
  })

  it('retries a failed search and selects the right patient among similar names', async () => {
    vi.mocked(getPatients).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({
      data: [
        { id: 'one', codigo_paciente: '001', nombres: 'María Uno', cedula: '0911111111', telefono: null, direccion: null, fecha_nacimiento: null },
        { id: 'two', codigo_paciente: '002', nombres: 'María Dos', cedula: '0922222222', telefono: null, direccion: null, fecha_nacimiento: null },
      ], current_page: 1, last_page: 2, per_page: 20, total: 21, next_page_url: '/pacientes?page=2', prev_page_url: null,
    })
    vi.mocked(createMedicalAppointment).mockResolvedValue('Cita registrada')
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Agendar' }))
    const form = screen.getByRole('form', { name: 'Agendar cita médica' })
    const search = within(form).getByRole('combobox', { name: 'Buscar paciente' })
    expect(getPatients).not.toHaveBeenCalled()
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
      vi.mocked(getPatients).mockResolvedValueOnce({
        data: Array.from({ length: 20 }, (_, index) => ({ id: `patient-${index}`, codigo_paciente: `P${index}`, nombres: `Paciente ${index}`, cedula: `09000000${String(index).padStart(2, '0')}`, telefono: null, direccion: null, fecha_nacimiento: null })),
        current_page: 1, last_page: 1, per_page: 20, total: 20, next_page_url: null, prev_page_url: null,
      })
      renderAgenda()
      selectOctober()
      fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
      fireEvent.click(await screen.findByRole('button', { name: 'Agendar' }))
      const search = screen.getByRole('combobox', { name: 'Buscar paciente' })
      fireEvent.change(search, { target: { value: 'Paciente' } })
      const list = await screen.findByRole('listbox')
      expect(await within(list).findAllByRole('option')).toHaveLength(20)
      expect(list).toHaveClass('max-h-56', 'overflow-y-auto', 'overflow-x-hidden')
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
  it('shows only real records for the selected day before opening creation', async () => {
    renderAgenda()
    selectOctober()
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledWith(10, 2026, expect.any(AbortSignal)))
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    const day = screen.getByRole('region', { name: '5 de octubre de 2026' })
    expect(day).toHaveTextContent('5 de octubre de 2026')
    expect(await within(day).findByText('2 registros')).toBeInTheDocument()
    expect(day).toHaveTextContent('Reunión')
    expect(day).toHaveTextContent('Control recibido')
    expect(day).toHaveTextContent('Paciente recibido')
    expect(day).toHaveTextContent('10:00–11:00')
    expect(day).toHaveTextContent('Estado: programada')
    expect(within(day).getByRole('button', { name: 'Agendar' })).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }))
    expect(screen.getByRole('button', { name: /Seleccionar 1 de noviembre/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('heading', { name: 'Selecciona un día' })).toBeInTheDocument()
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledWith(11, 2026, expect.any(AbortSignal)))
  })

  it('keeps an honest empty day and retryable load error', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('No disponible')).mockResolvedValueOnce([])
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    expect(await screen.findByText('Sin registros para este día.')).toBeInTheDocument()
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
    fireEvent.click(await screen.findByRole('button', { name: 'Agendar' }))
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
    expect(await within(screen.getByRole('region', { name: '5 de octubre de 2026' })).findByText('2 registros')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agendar' })).not.toBeInTheDocument()
  })

  it.each([[409, 'Horario ocupado.'], [422, 'El código de paciente no existe.']] as const)('shows backend %s and keeps the appointment form open', async (status, message) => {
    vi.mocked(createMedicalAppointment).mockRejectedValue({ isAxiosError: true, response: { status, data: { message } } })
    renderAgenda()
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Agendar' }))
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
    fireEvent.click(await screen.findByRole('button', { name: 'Agendar' }))
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
    fireEvent.click(await screen.findByRole('button', { name: 'Agendar' }))
    const form = screen.getByRole('form', { name: 'Agendar cita médica' })
    await choosePatient(form)
    fireEvent.change(within(form).getByLabelText('Hora de inicio'), { target: { value: '09:00' } })
    fireEvent.change(within(form).getByLabelText('Hora de fin'), { target: { value: '10:00' } })
    fireEvent.submit(form)
    expect(await screen.findByText(/La cita se registró, pero no fue posible actualizar el calendario/)).toBeInTheDocument()
    expect(createMedicalAppointment).toHaveBeenCalledOnce()
  })
})
