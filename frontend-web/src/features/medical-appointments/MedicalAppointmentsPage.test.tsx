import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MedicalAppointmentsPage } from './MedicalAppointmentsPage'
import { cancelAppointment, completeAppointment, createMedicalAppointment, createPersonalEntry, deleteAgendaEntry, getAgendaMonth, getPendingRequests, programRequest, registerClinicalData, updateAgendaEntry } from '../agenda/agendaService'

vi.mock('../agenda/agendaService', () => ({ getAgendaMonth: vi.fn(), getPendingRequests: vi.fn(), createMedicalAppointment: vi.fn(), createPersonalEntry: vi.fn(), programRequest: vi.fn(), updateAgendaEntry: vi.fn(), cancelAppointment: vi.fn(), completeAppointment: vi.fn(), deleteAgendaEntry: vi.fn(), registerClinicalData: vi.fn() }))
const personal = { id: 'personal-1', paciente_id: null, fecha: '2026-10-05', hora_inicio: '08:00', hora_fin: '09:00', tipo: 'personal' as const, descripcion: 'Reunión personal', estado: null, diagnostico: null, tratamiento: null, observacion: null, paciente: null }
const medical = { ...personal, id: 'medical-1', paciente_id: 'patient-1', tipo: 'cita_medica' as const, descripcion: 'Control recibido', estado: 'programada' as const, paciente: { codigo_paciente: '001', nombres: 'Paciente recibido' }, hora_inicio: '10:00', hora_fin: '11:00' }
const pending = { ...medical, id: 'request-1', fecha: null, hora_inicio: null, hora_fin: null, descripcion: null, estado: 'pendiente' as const }

beforeEach(() => { vi.resetAllMocks(); vi.mocked(getAgendaMonth).mockResolvedValue([personal, medical]); vi.mocked(getPendingRequests).mockResolvedValue([pending]) })

async function renderOctober() {
  render(<MedicalAppointmentsPage/>)
  fireEvent.change(screen.getByLabelText('Mes'), { target: { value: '2026-10' } })
  await screen.findByText('Control recibido')
}

describe('MedicalAppointmentsPage', () => {
  it('loads the confirmed month and shows only received medical appointments', async () => {
    await renderOctober()
    expect(getAgendaMonth).toHaveBeenCalledWith(10, 2026)
    expect(screen.getByText('Citas encontradas: 1')).toBeInTheDocument()
    const appointments = screen.getByRole('region', { name: 'Citas registradas' })
    expect(within(appointments).getByText('Paciente recibido')).toBeInTheDocument()
    expect(within(appointments).getByText('Código: 001')).toBeInTheDocument()
    expect(screen.getByText(/5 de octubre de 2026/)).toBeInTheDocument()
    expect(screen.queryByText('Reunión personal')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cita médica' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Actividad personal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Aceptar|Rechazar/ })).not.toBeInTheDocument()
    expect(createMedicalAppointment).not.toHaveBeenCalled()
    expect(createPersonalEntry).not.toHaveBeenCalled()
  })

  it('filters locally by the real status without another backend parameter', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValue([personal, medical, { ...medical, id: 'cancelled-1', descripcion: 'Cita cancelada', estado: 'cancelada' }])
    await renderOctober()
    const calls = vi.mocked(getAgendaMonth).mock.calls.length
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'cancelada' } })
    expect(screen.getByText('Citas encontradas: 1')).toBeInTheDocument()
    expect(screen.getByText('Cita cancelada')).toBeInTheDocument()
    expect(screen.queryByText('Control recibido')).not.toBeInTheDocument()
    expect(getAgendaMonth).toHaveBeenCalledTimes(calls)
  })

  it('loads another month through the existing monthly endpoint', async () => {
    await renderOctober()
    fireEvent.change(screen.getByLabelText('Mes'), { target: { value: '2026-11' } })
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledWith(11, 2026))
  })

  it('programs a real pending request with a selected date and refetches both views', async () => {
    vi.mocked(programRequest).mockResolvedValue('Solicitud programada correctamente.')
    await renderOctober()
    const beforeMonth = vi.mocked(getAgendaMonth).mock.calls.length
    const beforePending = vi.mocked(getPendingRequests).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Programar' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar solicitud' })
    expect(within(dialog).getByLabelText('Fecha')).toHaveValue('')
    fireEvent.change(within(dialog).getByLabelText('Fecha'), { target: { value: '2026-10-05' } })
    fireEvent.change(within(dialog).getByLabelText('Hora de inicio'), { target: { value: '11:00' } })
    fireEvent.change(within(dialog).getByLabelText('Hora de fin'), { target: { value: '12:00' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(programRequest).toHaveBeenCalledExactlyOnceWith('request-1', { fecha: '2026-10-05', hora_inicio: '11:00', hora_fin: '12:00' }))
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledTimes(beforeMonth + 1))
    expect(getPendingRequests).toHaveBeenCalledTimes(beforePending + 1)
  })

  it('shows backend 422 from programming without optimistic insertion', async () => {
    vi.mocked(programRequest).mockRejectedValueOnce({ isAxiosError: true, response: { status: 422, data: { message: 'Horario inválido.' } } })
    await renderOctober()
    const calls = vi.mocked(getAgendaMonth).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Programar' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar solicitud' })
    fireEvent.change(within(dialog).getByLabelText('Fecha'), { target: { value: '2026-10-05' } })
    fireEvent.change(within(dialog).getByLabelText('Hora de inicio'), { target: { value: '10:00' } })
    fireEvent.change(within(dialog).getByLabelText('Hora de fin'), { target: { value: '11:00' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Horario inválido.')
    expect(getAgendaMonth).toHaveBeenCalledTimes(calls)
  })

  it('edits an existing appointment with the confirmed fields', async () => {
    vi.mocked(updateAgendaEntry).mockResolvedValue('Registro actualizado correctamente.')
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar registro' })
    fireEvent.change(within(dialog).getByLabelText('Fecha'), { target: { value: '2026-10-06' } })
    fireEvent.change(within(dialog).getByLabelText('Descripción'), { target: { value: 'Cambio' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(updateAgendaEntry).toHaveBeenCalledExactlyOnceWith('medical-1', { fecha: '2026-10-06', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'Cambio' }))
  })

  it.each([
    ['Cancelar cita', 'Cancelar cita médica', cancelAppointment],
    ['Completar cita', 'Completar cita médica', completeAppointment],
    ['Eliminar', 'Eliminar registro', deleteAgendaEntry],
  ] as const)('confirms %s and refetches the monthly list', async (action, title, mutation) => {
    vi.mocked(mutation).mockResolvedValue('Operación completada.')
    await renderOctober()
    const calls = vi.mocked(getAgendaMonth).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: action }))
    expect(mutation).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: title })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(mutation).toHaveBeenCalledExactlyOnceWith('medical-1'))
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledTimes(calls + 1))
  })

  it('registers clinical data and shows the confirmed values after refetch', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValueOnce([medical]).mockResolvedValueOnce([{ ...medical, diagnostico: 'Diagnóstico recibido', tratamiento: 'Tratamiento recibido' }])
    vi.mocked(registerClinicalData).mockResolvedValue('Datos clínicos registrados correctamente.')
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar datos clínicos' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('El diagnóstico y el tratamiento son obligatorios.')
    fireEvent.change(within(dialog).getByLabelText('Diagnóstico *'), { target: { value: 'Diagnóstico recibido' } })
    fireEvent.change(within(dialog).getByLabelText('Tratamiento *'), { target: { value: 'Tratamiento recibido' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(registerClinicalData).toHaveBeenCalledExactlyOnceWith('medical-1', { diagnostico: 'Diagnóstico recibido', tratamiento: 'Tratamiento recibido', observacion: null }))
    expect(await screen.findByText('Editar datos clínicos')).toBeInTheDocument()
    expect(screen.getByText(/Diagnóstico recibido/)).toBeInTheDocument()
    expect(screen.getByText(/Tratamiento recibido/)).toBeInTheDocument()
  })

  it('preloads existing clinical fields for a completed appointment', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValue([{ ...medical, estado: 'completada', diagnostico: 'Diagnóstico previo', tratamiento: 'Tratamiento previo', observacion: 'Observación previa' }])
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Editar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar datos clínicos' })
    expect(within(dialog).getByLabelText('Diagnóstico *')).toHaveValue('Diagnóstico previo')
    expect(within(dialog).getByLabelText('Tratamiento *')).toHaveValue('Tratamiento previo')
    expect(within(dialog).getByLabelText('Observación')).toHaveValue('Observación previa')
  })

  it('does not offer clinical changes for cancelled appointments', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValue([{ ...medical, estado: 'cancelada' }])
    await renderOctober()
    expect(screen.queryByRole('button', { name: /datos clínicos/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar cita' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completar cita' })).not.toBeInTheDocument()
  })

  it('shows backend 409 when completion lacks clinical data', async () => {
    vi.mocked(completeAppointment).mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message: 'Debes registrar el diagnóstico y tratamiento antes de completar la cita.' } } })
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Completar cita' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar cita médica' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Debes registrar el diagnóstico y tratamiento antes de completar la cita.')
  })

  it.each([[404, 'Cita no encontrada.'], [409, 'La cita todavía no ha sido programada.'], [422, 'Los datos clínicos no son válidos.']] as const)('shows backend %i from clinical registration', async (status, message) => {
    vi.mocked(registerClinicalData).mockRejectedValueOnce({ isAxiosError: true, response: { status, data: { message } } })
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar datos clínicos' })
    fireEvent.change(within(dialog).getByLabelText('Diagnóstico *'), { target: { value: 'Diagnóstico' } })
    fireEvent.change(within(dialog).getByLabelText('Tratamiento *'), { target: { value: 'Tratamiento' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(message)
  })

  it.each([[{ isAxiosError: true }, 'No fue posible comunicarse con el servidor.'], [new Error('Respuesta inválida'), 'No fue posible completar la operación. Inténtalo de nuevo.']] as const)('keeps the clinical form open on %s', async (cause, message) => {
    vi.mocked(registerClinicalData).mockRejectedValueOnce(cause)
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar datos clínicos' })
    fireEvent.change(within(dialog).getByLabelText('Diagnóstico *'), { target: { value: 'Diagnóstico' } })
    fireEvent.change(within(dialog).getByLabelText('Tratamiento *'), { target: { value: 'Tratamiento' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(message)
    expect(dialog).toBeInTheDocument()
  })

  it('blocks repeated clinical mutation while the first request is pending', async () => {
    let resolveMutation: (message: string) => void = () => {}
    vi.mocked(registerClinicalData).mockImplementation(() => new Promise((resolve) => { resolveMutation = resolve }))
    await renderOctober()
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
