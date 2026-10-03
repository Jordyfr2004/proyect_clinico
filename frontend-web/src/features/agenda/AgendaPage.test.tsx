import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AgendaPage } from './AgendaPage'
import { getAgendaMonth, getPendingRequests, createPersonalEntry, createMedicalAppointment, programRequest, updateAgendaEntry, cancelAppointment, completeAppointment, deleteAgendaEntry, registerClinicalData } from './agendaService'
import { getPatients } from '../patients/patientService'

vi.mock('./agendaService', () => ({ getAgendaMonth: vi.fn(), getPendingRequests: vi.fn(), createPersonalEntry: vi.fn(), createMedicalAppointment: vi.fn(), programRequest: vi.fn(), updateAgendaEntry: vi.fn(), cancelAppointment: vi.fn(), completeAppointment: vi.fn(), deleteAgendaEntry: vi.fn(), registerClinicalData: vi.fn() }))
vi.mock('../patients/patientService', () => ({ getPatients: vi.fn() }))
const entry = { id: 'entry-1', paciente_id: null, fecha: '2026-10-05', hora_inicio: '10:00', hora_fin: '11:00', tipo: 'personal' as const, descripcion: 'Reunión', estado: null, diagnostico: null, tratamiento: null, observacion: null, paciente: null }
const pending = { ...entry, id: 'request-1', paciente_id: 'patient-1', fecha: null, hora_inicio: null, hora_fin: null, tipo: 'cita_medica' as const, descripcion: null, estado: 'pendiente' as const, paciente: { codigo_paciente: '001', nombres: 'Paciente recibido' } }
const medicalEntry = { ...entry, tipo: 'cita_medica' as const, estado: 'programada' as const, paciente_id: 'patient-1', paciente: { codigo_paciente: '001', nombres: 'Paciente recibido' } }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getAgendaMonth).mockResolvedValue([entry]); vi.mocked(getPendingRequests).mockResolvedValue([pending]); vi.mocked(getPatients).mockResolvedValue([]) })

describe('AgendaPage', () => {
  it('loads month and pending separately, shows only received entries and schedules a request', async () => {
    vi.mocked(programRequest).mockResolvedValue('Solicitud programada correctamente.')
    render(<MemoryRouter><AgendaPage/></MemoryRouter>)
    expect(await screen.findByText('Reunión')).toBeInTheDocument()
    expect(screen.getByText('Paciente recibido')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Programar' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar solicitud' })
    fireEvent.change(within(dialog).getByLabelText('Fecha'), { target: { value: '2026-10-05' } })
    fireEvent.change(within(dialog).getByLabelText('Hora de inicio'), { target: { value: '11:00' } })
    fireEvent.change(within(dialog).getByLabelText('Hora de fin'), { target: { value: '12:00' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(programRequest).toHaveBeenCalledWith('request-1', { fecha: '2026-10-05', hora_inicio: '11:00', hora_fin: '12:00' }))
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledTimes(2))
    expect(getPendingRequests).toHaveBeenCalledTimes(2)
  })

  it('creates a personal entry and reports backend conflicts without optimistic insertion', async () => {
    vi.mocked(createPersonalEntry).mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: { message: 'Ese horario ya se encuentra ocupado.' } } })
    render(<MemoryRouter><AgendaPage/></MemoryRouter>)
    await screen.findByText('Reunión')
    fireEvent.click(screen.getByRole('button', { name: 'Actividad personal' }))
    const dialog = screen.getByRole('dialog', { name: 'Actividad personal' })
    fireEvent.change(within(dialog).getByLabelText('Descripción'), { target: { value: 'Bloque' } })
    fireEvent.change(within(dialog).getByLabelText('Hora de inicio'), { target: { value: '10:00' } })
    fireEvent.change(within(dialog).getByLabelText('Hora de fin'), { target: { value: '11:00' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Ese horario ya se encuentra ocupado.')
    expect(getAgendaMonth).toHaveBeenCalledTimes(1)
  })

  it('offers confirmed actions on real entries and fetches real patients for medical creation', async () => {
    vi.mocked(getPatients).mockResolvedValue([{ id: 'patient-1', codigo_paciente: '001', nombres: 'Paciente recibido', cedula: '123', telefono: null, direccion: null, fecha_nacimiento: null }])
    render(<MemoryRouter><AgendaPage/></MemoryRouter>)
    await screen.findByText('Reunión')
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    for (const action of ['Editar', 'Eliminar']) expect(screen.getByRole('button', { name: action })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cita médica' }))
    expect(await screen.findByRole('option', { name: /Paciente recibido/ })).toBeInTheDocument()
    expect(createMedicalAppointment).not.toHaveBeenCalled()
    expect(updateAgendaEntry).not.toHaveBeenCalled()
    expect(cancelAppointment).not.toHaveBeenCalled()
    expect(completeAppointment).not.toHaveBeenCalled()
    expect(deleteAgendaEntry).not.toHaveBeenCalled()
  })

  it('creates a medical appointment with the selected real patient code and refreshes both lists', async () => {
    vi.mocked(getPatients).mockResolvedValue([{ id: 'patient-1', codigo_paciente: '001', nombres: 'Paciente recibido', cedula: '123', telefono: null, direccion: null, fecha_nacimiento: null }])
    vi.mocked(createMedicalAppointment).mockResolvedValue('Cita médica registrada correctamente.')
    render(<MemoryRouter><AgendaPage/></MemoryRouter>)
    await screen.findByText('Reunión')
    fireEvent.click(screen.getByRole('button', { name: 'Cita médica' }))
    const dialog = screen.getByRole('dialog', { name: 'Cita médica' })
    await within(dialog).findByRole('option', { name: /Paciente recibido/ })
    fireEvent.change(within(dialog).getByLabelText('Paciente'), { target: { value: '001' } })
    fireEvent.change(within(dialog).getByLabelText('Fecha'), { target: { value: '2026-10-05' } })
    fireEvent.change(within(dialog).getByLabelText('Hora de inicio'), { target: { value: '10:00' } })
    fireEvent.change(within(dialog).getByLabelText('Hora de fin'), { target: { value: '11:00' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(createMedicalAppointment).toHaveBeenCalledWith({ codigo_paciente: '001', fecha: '2026-10-05', hora_inicio: '10:00', hora_fin: '11:00', descripcion: null }))
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledTimes(2))
    expect(getPendingRequests).toHaveBeenCalledTimes(2)
  })

  it('edits a received entry using the confirmed PUT fields', async () => {
    vi.mocked(updateAgendaEntry).mockResolvedValue('Registro actualizado correctamente.')
    render(<MemoryRouter><AgendaPage/></MemoryRouter>)
    await screen.findByText('Reunión')
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar registro' })
    fireEvent.change(within(dialog).getByLabelText('Descripción'), { target: { value: 'Cambio' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(updateAgendaEntry).toHaveBeenCalledWith('entry-1', { fecha: '2026-10-05', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'Cambio' }))
  })

  it.each([
    ['Cancelar cita', 'Cancelar cita médica', cancelAppointment],
    ['Completar cita', 'Completar cita médica', completeAppointment],
    ['Eliminar', 'Eliminar registro', deleteAgendaEntry],
  ] as const)('confirms %s and refreshes the agenda', async (action, title, mutation) => {
    vi.mocked(getAgendaMonth).mockResolvedValue([{ ...entry, tipo: 'cita_medica', estado: 'programada', paciente_id: 'patient-1', paciente: { codigo_paciente: '001', nombres: 'Paciente recibido' } }])
    vi.mocked(mutation).mockResolvedValue('Operación completada.')
    render(<MemoryRouter><AgendaPage/></MemoryRouter>)
    await screen.findByText('Reunión')
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    fireEvent.click(screen.getByRole('button', { name: action }))
    expect(mutation).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: title })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(mutation).toHaveBeenCalledExactlyOnceWith('entry-1'))
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledTimes(2))
    expect(getPendingRequests).toHaveBeenCalledTimes(2)
  })

  it('shows backend 422 without changing the calendar', async () => {
    vi.mocked(programRequest).mockRejectedValueOnce({ isAxiosError: true, response: { status: 422, data: { message: 'Horario inválido.' } } })
    render(<MemoryRouter><AgendaPage/></MemoryRouter>)
    await screen.findByText('Reunión')
    fireEvent.click(screen.getByRole('button', { name: 'Programar' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar solicitud' })
    fireEvent.change(within(dialog).getByLabelText('Fecha'), { target: { value: '2026-10-05' } })
    fireEvent.change(within(dialog).getByLabelText('Hora de inicio'), { target: { value: '10:00' } })
    fireEvent.change(within(dialog).getByLabelText('Hora de fin'), { target: { value: '11:00' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Horario inválido.')
    expect(getAgendaMonth).toHaveBeenCalledTimes(1)
  })

  it('registers clinical data for a programmed appointment and reloads both GET views', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValueOnce([medicalEntry]).mockResolvedValueOnce([{ ...medicalEntry, diagnostico: 'Diagnóstico recibido', tratamiento: 'Tratamiento recibido' }])
    vi.mocked(registerClinicalData).mockResolvedValue('Datos clínicos registrados correctamente.')
    render(<MemoryRouter><AgendaPage/></MemoryRouter>)
    await screen.findByText('Reunión')
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar datos clínicos' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('El diagnóstico y el tratamiento son obligatorios.')
    expect(registerClinicalData).not.toHaveBeenCalled()
    fireEvent.change(within(dialog).getByLabelText('Diagnóstico *'), { target: { value: 'Diagnóstico recibido' } })
    fireEvent.change(within(dialog).getByLabelText('Tratamiento *'), { target: { value: 'Tratamiento recibido' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(registerClinicalData).toHaveBeenCalledExactlyOnceWith('entry-1', { diagnostico: 'Diagnóstico recibido', tratamiento: 'Tratamiento recibido', observacion: null }))
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledTimes(2))
    expect(getPendingRequests).toHaveBeenCalledTimes(2)
    expect(await screen.findByRole('button', { name: 'Editar datos clínicos' })).toBeInTheDocument()
  })

  it('preloads existing clinical data and permits editing on a completed appointment', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValue([{ ...medicalEntry, estado: 'completada', diagnostico: 'Diagnóstico previo', tratamiento: 'Tratamiento previo', observacion: 'Observación previa' }])
    render(<MemoryRouter><AgendaPage/></MemoryRouter>)
    await screen.findByText('Reunión')
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar datos clínicos' })
    expect(within(dialog).getByLabelText('Diagnóstico *')).toHaveValue('Diagnóstico previo')
    expect(within(dialog).getByLabelText('Tratamiento *')).toHaveValue('Tratamiento previo')
    expect(within(dialog).getByLabelText('Observación')).toHaveValue('Observación previa')
  })

  it.each([
    entry,
    { ...medicalEntry, estado: 'cancelada' as const },
  ])('does not offer clinical data for %s', async (record) => {
    vi.mocked(getAgendaMonth).mockResolvedValue([record])
    render(<MemoryRouter><AgendaPage/></MemoryRouter>)
    await screen.findByText('Reunión')
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    expect(screen.queryByRole('button', { name: /datos clínicos/ })).not.toBeInTheDocument()
  })

  it('does not offer clinical data on a pending request', async () => {
    render(<MemoryRouter><AgendaPage/></MemoryRouter>)
    await screen.findByText('Paciente recibido')
    expect(screen.queryByRole('button', { name: /datos clínicos/ })).not.toBeInTheDocument()
  })

  it('shows the backend 409 when completion lacks clinical data', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValue([medicalEntry])
    vi.mocked(completeAppointment).mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message: 'Debes registrar el diagnóstico y tratamiento antes de completar la cita.' } } })
    render(<MemoryRouter><AgendaPage/></MemoryRouter>)
    await screen.findByText('Reunión')
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Completar cita' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar cita médica' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Debes registrar el diagnóstico y tratamiento antes de completar la cita.')
    expect(getAgendaMonth).toHaveBeenCalledTimes(1)
  })

  it.each([
    [404, 'Cita no encontrada.'],
    [409, 'La cita todavía no ha sido programada.'],
    [422, 'Los datos clínicos no son válidos.'],
  ])('shows the backend %i message from clinical registration', async (status, message) => {
    vi.mocked(getAgendaMonth).mockResolvedValue([medicalEntry])
    vi.mocked(registerClinicalData).mockRejectedValueOnce({ isAxiosError: true, response: { status, data: { message } } })
    render(<MemoryRouter><AgendaPage/></MemoryRouter>)
    await screen.findByText('Reunión')
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar datos clínicos' })
    fireEvent.change(within(dialog).getByLabelText('Diagnóstico *'), { target: { value: 'Diagnóstico' } })
    fireEvent.change(within(dialog).getByLabelText('Tratamiento *'), { target: { value: 'Tratamiento' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(message)
    expect(getAgendaMonth).toHaveBeenCalledTimes(1)
  })

  it.each([
    [{ isAxiosError: true }, 'No fue posible comunicarse con el servidor.'],
    [new Error('Respuesta inválida'), 'No fue posible completar la operación. Inténtalo de nuevo.'],
  ])('keeps the form open on connection or invalid response errors', async (cause, message) => {
    vi.mocked(getAgendaMonth).mockResolvedValue([medicalEntry])
    vi.mocked(registerClinicalData).mockRejectedValueOnce(cause)
    render(<MemoryRouter><AgendaPage/></MemoryRouter>)
    await screen.findByText('Reunión')
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar datos clínicos' })
    fireEvent.change(within(dialog).getByLabelText('Diagnóstico *'), { target: { value: 'Diagnóstico' } })
    fireEvent.change(within(dialog).getByLabelText('Tratamiento *'), { target: { value: 'Tratamiento' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(message)
    expect(dialog).toBeInTheDocument()
  })

  it('blocks a second clinical mutation while the first request is pending', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValue([medicalEntry])
    let resolveMutation: (message: string) => void = () => {}
    vi.mocked(registerClinicalData).mockImplementation(() => new Promise((resolve) => { resolveMutation = resolve }))
    render(<MemoryRouter><AgendaPage/></MemoryRouter>)
    await screen.findByText('Reunión')
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar datos clínicos' })
    fireEvent.change(within(dialog).getByLabelText('Diagnóstico *'), { target: { value: 'Diagnóstico' } })
    fireEvent.change(within(dialog).getByLabelText('Tratamiento *'), { target: { value: 'Tratamiento' } })
    const form = within(dialog).getByRole('form', { name: 'Datos clínicos de la cita' })
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(registerClinicalData).toHaveBeenCalledTimes(1)
    expect(within(dialog).getByRole('button', { name: 'Guardando…' })).toBeDisabled()
    resolveMutation('Datos clínicos registrados correctamente.')
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledTimes(2))
  })
})
