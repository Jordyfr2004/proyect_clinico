import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MedicalAppointmentsPage } from './MedicalAppointmentsPage'
import { cancelAppointment, completeAppointment, createMedicalAppointment, createPersonalEntry, deleteAgendaEntry, getAgendaMonth, getPendingRequests, programRequest, registerClinicalData, updateAgendaEntry } from '../agenda/agendaService'

vi.mock('../agenda/agendaService', () => ({ getAgendaMonth: vi.fn(), getPendingRequests: vi.fn(), createMedicalAppointment: vi.fn(), createPersonalEntry: vi.fn(), programRequest: vi.fn(), updateAgendaEntry: vi.fn(), cancelAppointment: vi.fn(), completeAppointment: vi.fn(), deleteAgendaEntry: vi.fn(), registerClinicalData: vi.fn() }))
const personal = { id: 'personal-1', paciente_id: null, fecha: '2026-10-05', hora_inicio: '08:00', hora_fin: '09:00', tipo: 'personal' as const, descripcion: 'Reunión personal', estado: null, diagnostico: null, tratamiento: null, observacion: null, paciente: null }
const medical = { ...personal, id: 'medical-1', paciente_id: 'patient-1', tipo: 'cita_medica' as const, descripcion: 'Control recibido', estado: 'programada' as const, paciente: { codigo_paciente: '001', nombres: 'Paciente recibido' }, hora_inicio: '10:00', hora_fin: '11:00' }
const readyMedical = { ...medical, diagnostico: 'Diagnóstico previo', tratamiento: 'Tratamiento previo' }
const pending = { ...medical, id: 'request-1', fecha: null, hora_inicio: null, hora_fin: null, descripcion: null, estado: 'pendiente' as const }

beforeEach(() => { vi.resetAllMocks(); vi.mocked(getAgendaMonth).mockResolvedValue([personal, medical]); vi.mocked(getPendingRequests).mockResolvedValue([pending]) })
afterEach(() => { vi.unstubAllGlobals() })

async function renderOctober() {
  render(<MedicalAppointmentsPage/>)
  fireEvent.change(screen.getByLabelText('Mes'), { target: { value: '2026-10' } })
  await screen.findAllByRole('button', { name: 'Ver detalles' })
}

describe('MedicalAppointmentsPage', () => {
  it('loads the confirmed month and shows only received medical appointments', async () => {
    await renderOctober()
    expect(getAgendaMonth).toHaveBeenCalledWith(10, 2026, expect.any(AbortSignal))
    expect(screen.getByText('Citas encontradas: 1')).toBeInTheDocument()
    const appointments = screen.getByRole('region', { name: 'Citas registradas' })
    expect(within(appointments).getByText('Paciente recibido')).toBeInTheDocument()
    expect(within(appointments).getByText('Código: 001')).toBeInTheDocument()
    expect(within(appointments).getByText(/5 de octubre de 2026/)).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    expect(within(screen.getByRole('region', { name: 'Detalles de la cita' })).getByText('Cita cancelada')).toBeInTheDocument()
    expect(screen.queryByText('Control recibido')).not.toBeInTheDocument()
    expect(getAgendaMonth).toHaveBeenCalledTimes(calls)
  })

  it('searches loaded patients by name or code and clears the local filters', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValue([medical, { ...medical, id: 'medical-2', descripcion: 'Otro control', paciente: { codigo_paciente: '002', nombres: 'María López' } }])
    await renderOctober()
    fireEvent.change(screen.getByLabelText('Buscar paciente'), { target: { value: '002' } })
    expect(screen.getByText('Citas encontradas: 1')).toBeInTheDocument()
    expect(screen.getByText('María López')).toBeInTheDocument()
    expect(screen.queryByText('Paciente recibido')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Buscar paciente'), { target: { value: 'paciente recibido' } })
    expect(screen.getByText('Paciente recibido')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(screen.getByLabelText('Buscar paciente')).toHaveValue('')
    expect(screen.getByLabelText('Mes')).toHaveValue(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
    expect(screen.getByLabelText('Estado')).toHaveValue('todos')
    expect(screen.getByLabelText('Día')).toHaveValue('todos')
  })

  it('places real pending requests in a separate tab without duplicating them', async () => {
    await renderOctober()
    const registeredTab = screen.getByRole('tab', { name: /Citas registradas.*1/ })
    expect(registeredTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Solicitudes pendientes.*1/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Programar' })).not.toBeInTheDocument()
    registeredTab.focus()
    fireEvent.keyDown(registeredTab, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: /Solicitudes pendientes.*1/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Programar' })).toBeInTheDocument()
    expect(screen.queryByText('Control recibido')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Buscar paciente'), { target: { value: '999' } })
    expect(screen.getByText('Sin solicitudes pendientes')).toBeInTheDocument()
  })

  it('distinguishes the four confirmed appointment states visually and by text', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValue([
      medical,
      { ...medical, id: 'pending-month', estado: 'pendiente' },
      { ...medical, id: 'completed-month', estado: 'completada' },
      { ...medical, id: 'cancelled-month', estado: 'cancelada' },
    ])
    await renderOctober()
    const appointments = screen.getByRole('region', { name: 'Citas registradas' })
    expect(within(appointments).getByText('Pendiente')).toHaveClass('admin-pill-pending')
    expect(within(appointments).getByText('Programada')).toHaveClass('admin-pill-ready')
    expect(within(appointments).getByText('Completada')).toHaveClass('admin-pill-completed')
    expect(within(appointments).getByText('Cancelada')).toHaveClass('admin-pill-cancelled')
  })

  it('loads another month through the existing monthly endpoint', async () => {
    await renderOctober()
    fireEvent.change(screen.getByLabelText('Mes'), { target: { value: '2026-11' } })
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledWith(11, 2026, expect.any(AbortSignal)))
  })

  it('programs a real pending request with a selected date and refetches both views', async () => {
    vi.mocked(programRequest).mockResolvedValue('Solicitud programada correctamente.')
    await renderOctober()
    fireEvent.click(screen.getByRole('tab', { name: /Solicitudes pendientes/ }))
    const beforeMonth = vi.mocked(getAgendaMonth).mock.calls.length
    const beforePending = vi.mocked(getPendingRequests).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Programar' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar solicitud' })
    const today = new Date()
    const selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-05`
    const day = within(dialog).getByRole('button', { name: /Seleccionar 5 de/ })
    fireEvent.click(day)
    expect(day).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(within(dialog).getByLabelText('Hora de inicio'), { target: { value: '11:00' } })
    fireEvent.change(within(dialog).getByLabelText('Hora de fin'), { target: { value: '12:00' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(programRequest).toHaveBeenCalledExactlyOnceWith('request-1', { fecha: selectedDate, hora_inicio: '11:00', hora_fin: '12:00' }))
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledTimes(beforeMonth + 1))
    expect(getPendingRequests).toHaveBeenCalledTimes(beforePending + 1)
  })

  it('moves calendar focus across months with the keyboard before selecting a date', async () => {
    await renderOctober()
    fireEvent.click(screen.getByRole('tab', { name: /Solicitudes pendientes/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Programar' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar solicitud' })
    const currentMonth = new Date()
    const currentLabel = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' }).format(currentMonth)
    expect(within(dialog).getByRole('button', { name: `Seleccionar ${currentMonth.getDate()} de ${currentLabel}` })).toHaveAttribute('aria-current', 'date')
    const firstDay = within(dialog).getByRole('button', { name: `Seleccionar 1 de ${currentLabel}` })
    fireEvent.keyDown(firstDay, { key: 'ArrowLeft' })
    const lastPreviousDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0)
    const previousLabel = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' }).format(lastPreviousDay)
    await waitFor(() => expect(within(dialog).getByRole('button', { name: `Seleccionar ${lastPreviousDay.getDate()} de ${previousLabel}` })).toHaveFocus())
    expect(within(dialog).getByRole('group', { name: 'Fecha' })).toBeInTheDocument()
    expect(programRequest).not.toHaveBeenCalled()
  })

  it('keeps date and time validation before programming a request', async () => {
    await renderOctober()
    fireEvent.click(screen.getByRole('tab', { name: /Solicitudes pendientes/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Programar' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar solicitud' })
    fireEvent.change(within(dialog).getByLabelText('Hora de inicio'), { target: { value: '11:00' } })
    fireEvent.change(within(dialog).getByLabelText('Hora de fin'), { target: { value: '12:00' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Revisa la fecha y el horario')
    expect(programRequest).not.toHaveBeenCalled()
  })

  it('shows backend 422 from programming without optimistic insertion', async () => {
    vi.mocked(programRequest).mockRejectedValueOnce({ isAxiosError: true, response: { status: 422, data: { message: 'Horario inválido.' } } })
    await renderOctober()
    fireEvent.click(screen.getByRole('tab', { name: /Solicitudes pendientes/ }))
    const calls = vi.mocked(getAgendaMonth).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Programar' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar solicitud' })
    fireEvent.click(within(dialog).getByRole('button', { name: /Seleccionar 5 de/ }))
    fireEvent.change(within(dialog).getByLabelText('Hora de inicio'), { target: { value: '10:00' } })
    fireEvent.change(within(dialog).getByLabelText('Hora de fin'), { target: { value: '11:00' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Horario inválido.')
    expect(getAgendaMonth).toHaveBeenCalledTimes(calls)
  })

  it('edits an existing appointment with the confirmed fields', async () => {
    vi.mocked(updateAgendaEntry).mockResolvedValue('Registro actualizado correctamente.')
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Opciones de cita para Paciente recibido' }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar cita' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar cita médica' })
    const date = within(dialog).getByLabelText('Fecha de la cita *')
    expect(date).toHaveAttribute('type', 'date')
    expect(date).toHaveValue('2026-10-05')
    fireEvent.change(date, { target: { value: '2026-10-06' } })
    fireEvent.change(within(dialog).getByLabelText('Descripción'), { target: { value: 'Cambio' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(updateAgendaEntry).toHaveBeenCalledExactlyOnceWith('medical-1', { fecha: '2026-10-06', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'Cambio' }))
  })

  it.each([
    ['Cancelar cita', 'Cancelar cita médica', cancelAppointment],
    ['Eliminar', 'Eliminar registro', deleteAgendaEntry],
  ] as const)('confirms %s and refetches the monthly list', async (action, title, mutation) => {
    vi.mocked(mutation).mockResolvedValue('Operación completada.')
    await renderOctober()
    const calls = vi.mocked(getAgendaMonth).mock.calls.length
    if (action === 'Eliminar') fireEvent.click(screen.getByRole('button', { name: 'Opciones de cita para Paciente recibido' }))
    else fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    fireEvent.click(screen.getByRole('button', { name: action }))
    expect(mutation).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: title })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(mutation).toHaveBeenCalledExactlyOnceWith('medical-1'))
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledTimes(calls + 1))
  })

  it('asks for an activity and price, then completes the appointment with one request', async () => {
    vi.mocked(completeAppointment).mockResolvedValue('Cita marcada como completada.')
    vi.mocked(getAgendaMonth).mockResolvedValue([readyMedical])
    await renderOctober()
    const calls = vi.mocked(getAgendaMonth).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Completar cita' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar cita médica' })
    expect(within(dialog).getByText(/Actividades/)).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Actividad realizada'), { target: { value: 'Limpieza dental' } })
    fireEvent.change(within(dialog).getByLabelText('Precio'), { target: { value: '35.50' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Completar cita' }))
    await waitFor(() => expect(completeAppointment).toHaveBeenCalledExactlyOnceWith('medical-1', { actividad: 'Limpieza dental', precio: 35.5 }))
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledTimes(calls + 1))
    expect(await screen.findByText('Cita marcada como completada.')).toBeInTheDocument()
  })

  it('requires a valid activity and price before completing', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValue([readyMedical])
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Completar cita' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar cita médica' })
    const complete = within(dialog).getByRole('button', { name: 'Completar cita' })
    fireEvent.click(complete)
    expect(within(dialog).getByRole('alert')).toHaveTextContent('actividad')
    fireEvent.change(within(dialog).getByLabelText('Actividad realizada'), { target: { value: 'Limpieza dental' } })
    fireEvent.change(within(dialog).getByLabelText('Precio'), { target: { value: '35.999' } })
    fireEvent.click(complete)
    expect(within(dialog).getByRole('alert')).toHaveTextContent('precio')
    expect(completeAppointment).not.toHaveBeenCalled()
  })

  it('blocks a second completion while the first request is pending', async () => {
    vi.mocked(completeAppointment).mockReturnValue(new Promise(() => {}))
    vi.mocked(getAgendaMonth).mockResolvedValue([readyMedical])
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Completar cita' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar cita médica' })
    fireEvent.change(within(dialog).getByLabelText('Actividad realizada'), { target: { value: 'Limpieza dental' } })
    fireEvent.change(within(dialog).getByLabelText('Precio'), { target: { value: '35.50' } })
    const form = within(dialog).getByRole('form', { name: 'Actividad realizada en la cita' })
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(completeAppointment).toHaveBeenCalledTimes(1)
    expect(within(dialog).getByRole('button', { name: 'Guardando…' })).toBeDisabled()
  })

  it('moves focus to the page heading when deleting removes the original action', async () => {
    vi.mocked(getPendingRequests).mockResolvedValue([])
    vi.mocked(deleteAgendaEntry).mockResolvedValue('Registro eliminado correctamente.')
    await renderOctober()
    vi.mocked(getAgendaMonth).mockResolvedValue([])
    fireEvent.click(screen.getByRole('button', { name: 'Opciones de cita para Paciente recibido' }))
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Eliminar registro' })).getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Sin citas en esta vista')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Citas médicas' })).toHaveFocus()
  })

  it('registers clinical data and shows the confirmed values after refetch', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValueOnce([medical]).mockResolvedValueOnce([{ ...medical, diagnostico: 'Diagnóstico recibido', tratamiento: 'Tratamiento recibido' }])
    vi.mocked(registerClinicalData).mockResolvedValue('Datos clínicos registrados correctamente.')
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar datos clínicos' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('El diagnóstico y el tratamiento son obligatorios.')
    fireEvent.change(within(dialog).getByLabelText('Diagnóstico * (obligatorio)'), { target: { value: 'Diagnóstico recibido' } })
    fireEvent.change(within(dialog).getByLabelText('Tratamiento * (obligatorio)'), { target: { value: 'Tratamiento recibido' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(registerClinicalData).toHaveBeenCalledExactlyOnceWith('medical-1', { diagnostico: 'Diagnóstico recibido', tratamiento: 'Tratamiento recibido', observacion: null }))
    expect(await screen.findByRole('button', { name: 'Completar cita' })).toBeInTheDocument()
    expect(screen.getByText(/Diagnóstico recibido/)).toBeInTheDocument()
    expect(screen.getByText(/Tratamiento recibido/)).toBeInTheDocument()
  })

  it('preloads existing clinical fields for a completed appointment', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValue([{ ...medical, estado: 'completada', diagnostico: 'Diagnóstico previo', tratamiento: 'Tratamiento previo', observacion: 'Observación previa' }])
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar datos clínicos' })
    expect(within(dialog).getByLabelText('Diagnóstico * (obligatorio)')).toHaveValue('Diagnóstico previo')
    expect(within(dialog).getByLabelText('Tratamiento * (obligatorio)')).toHaveValue('Tratamiento previo')
    expect(within(dialog).getByLabelText('Observación (opcional)')).toHaveValue('Observación previa')
  })

  it('opens a focused details panel with explicit missing fields and restores focus on close', async () => {
    await renderOctober()
    const trigger = screen.getByRole('button', { name: 'Ver detalles' })
    fireEvent.click(trigger)
    const panel = screen.getByRole('region', { name: 'Detalles de la cita' })
    expect(panel.parentElement).toBe(document.body)
    expect(within(panel).getByRole('region', { name: 'Información clínica de la cita' })).toBeInTheDocument()
    expect(within(panel).getByText('Paciente recibido')).toBeInTheDocument()
    expect(within(panel).getByText('Código: 001')).toBeInTheDocument()
    expect(within(panel).getByText('Control recibido')).toBeInTheDocument()
    expect(within(panel).getAllByText('Sin datos registrados')).toHaveLength(3)
    expect(within(panel).getByRole('button', { name: 'Registrar datos clínicos' })).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'Completar cita' })).not.toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Cerrar detalles' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Detalles de la cita' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('keeps the panel visible during its exit transition before restoring focus', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    await renderOctober()
    const trigger = screen.getByRole('button', { name: 'Ver detalles' })
    fireEvent.click(trigger)
    fireEvent.click(within(screen.getByRole('region', { name: 'Detalles de la cita' })).getByRole('button', { name: 'Cerrar detalles' }))
    expect(screen.getByRole('region', { name: 'Detalles de la cita' })).toHaveAttribute('data-exiting', 'true')
    expect(trigger).not.toHaveFocus()
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Detalles de la cita' })).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it('keeps the selected panel and list position after saving clinical data', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValueOnce([medical]).mockResolvedValueOnce([{ ...medical, diagnostico: 'Nuevo diagnóstico', tratamiento: 'Nuevo tratamiento' }])
    vi.mocked(registerClinicalData).mockResolvedValue('Datos clínicos guardados.')
    await renderOctober()
    const list = screen.getByRole('list', { name: 'Listado de citas' })
    list.scrollTop = 120
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar datos clínicos' })
    fireEvent.change(within(dialog).getByLabelText('Diagnóstico * (obligatorio)'), { target: { value: 'Nuevo diagnóstico' } })
    fireEvent.change(within(dialog).getByLabelText('Tratamiento * (obligatorio)'), { target: { value: 'Nuevo tratamiento' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const panel = screen.getByRole('region', { name: 'Detalles de la cita' })
    expect(within(panel).getByText('Nuevo diagnóstico')).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Cerrar detalles' })).toHaveFocus()
    expect(screen.getByRole('list', { name: 'Listado de citas' })).toBe(list)
    expect(list.scrollTop).toBe(120)
  })

  it('keeps the panel and restores its action focus after cancelling an edit', async () => {
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    const action = screen.getByRole('button', { name: 'Registrar datos clínicos' })
    fireEvent.click(action)
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Registrar datos clínicos' })).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('region', { name: 'Detalles de la cita' })).toBeInTheDocument()
    expect(action).toHaveFocus()
  })

  it('returns focus to the card when cancelling an edit opened from its menu', async () => {
    await renderOctober()
    const menuButton = screen.getByRole('button', { name: 'Opciones de cita para Paciente recibido' })
    fireEvent.click(menuButton)
    fireEvent.click(screen.getByRole('button', { name: 'Editar cita' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Editar cita médica' })).getByRole('button', { name: 'Cancelar' }))
    expect(menuButton).toHaveFocus()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the permitted primary action for complete clinical data and completed appointments', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValue([readyMedical, { ...readyMedical, id: 'completed-1', estado: 'completada' }])
    await renderOctober()
    const triggers = screen.getAllByRole('button', { name: 'Ver detalles' })
    fireEvent.click(triggers[0])
    expect(within(screen.getByRole('region', { name: 'Detalles de la cita' })).getByRole('button', { name: 'Completar cita' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Detalles de la cita' })).getByRole('button', { name: 'Editar datos clínicos' })).toBeInTheDocument()
    fireEvent.click(triggers[1])
    const panel = screen.getByRole('region', { name: 'Detalles de la cita' })
    expect(within(panel).getByRole('button', { name: 'Editar datos clínicos' })).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'Cancelar cita' })).not.toBeInTheDocument()
  })

  it('keeps the patient context and preloaded values in the clinical form', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValue([{ ...readyMedical, estado: 'completada' }])
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar datos clínicos' })
    expect(within(dialog).getByText('Paciente recibido')).toBeInTheDocument()
    expect(within(dialog).getByText(/Código: 001/)).toBeInTheDocument()
    expect(within(dialog).getByText(/5 de octubre de 2026/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Diagnóstico * (obligatorio)')).toHaveValue('Diagnóstico previo')
    expect(within(dialog).getByLabelText('Tratamiento * (obligatorio)')).toHaveValue('Tratamiento previo')
    expect(within(dialog).getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
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
    vi.mocked(getAgendaMonth).mockResolvedValue([readyMedical])
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Completar cita' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar cita médica' })
    fireEvent.change(within(dialog).getByLabelText('Actividad realizada'), { target: { value: 'Limpieza dental' } })
    fireEvent.change(within(dialog).getByLabelText('Precio'), { target: { value: '35.50' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Completar cita' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Debes registrar el diagnóstico y tratamiento antes de completar la cita.')
  })

  it('keeps the completion form open when Laravel rejects the activity or price', async () => {
    vi.mocked(completeAppointment).mockRejectedValue({ isAxiosError: true, response: { status: 422, data: { message: 'El precio no es válido.' } } })
    vi.mocked(getAgendaMonth).mockResolvedValue([readyMedical])
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Completar cita' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar cita médica' })
    fireEvent.change(within(dialog).getByLabelText('Actividad realizada'), { target: { value: 'Control' } })
    fireEvent.change(within(dialog).getByLabelText('Precio'), { target: { value: '0' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Completar cita' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('El precio no es válido.')
    expect(completeAppointment).toHaveBeenCalledExactlyOnceWith('medical-1', { actividad: 'Control', precio: 0 })
    expect(dialog).toBeInTheDocument()
  })

  it.each([[404, 'Cita no encontrada.'], [409, 'La cita todavía no ha sido programada.'], [422, 'Los datos clínicos no son válidos.']] as const)('shows backend %i from clinical registration', async (status, message) => {
    vi.mocked(registerClinicalData).mockRejectedValueOnce({ isAxiosError: true, response: { status, data: { message } } })
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar datos clínicos' })
    fireEvent.change(within(dialog).getByLabelText('Diagnóstico * (obligatorio)'), { target: { value: 'Diagnóstico' } })
    fireEvent.change(within(dialog).getByLabelText('Tratamiento * (obligatorio)'), { target: { value: 'Tratamiento' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(message)
  })

  it.each([[{ isAxiosError: true }, 'No fue posible comunicarse con el servidor.'], [new Error('Respuesta inválida'), 'No fue posible completar la operación. Inténtalo de nuevo.']] as const)('keeps the clinical form open on %s', async (cause, message) => {
    vi.mocked(registerClinicalData).mockRejectedValueOnce(cause)
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar datos clínicos' })
    fireEvent.change(within(dialog).getByLabelText('Diagnóstico * (obligatorio)'), { target: { value: 'Diagnóstico' } })
    fireEvent.change(within(dialog).getByLabelText('Tratamiento * (obligatorio)'), { target: { value: 'Tratamiento' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(message)
    expect(dialog).toBeInTheDocument()
  })

  it('blocks repeated clinical mutation while the first request is pending', async () => {
    let resolveMutation: (message: string) => void = () => {}
    vi.mocked(registerClinicalData).mockImplementation(() => new Promise((resolve) => { resolveMutation = resolve }))
    await renderOctober()
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar datos clínicos' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar datos clínicos' })
    fireEvent.change(within(dialog).getByLabelText('Diagnóstico * (obligatorio)'), { target: { value: 'Diagnóstico' } })
    fireEvent.change(within(dialog).getByLabelText('Tratamiento * (obligatorio)'), { target: { value: 'Tratamiento' } })
    const form = within(dialog).getByRole('form', { name: 'Datos clínicos de la cita' })
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(registerClinicalData).toHaveBeenCalledTimes(1)
    expect(within(dialog).getByRole('button', { name: 'Guardando…' })).toBeDisabled()
    resolveMutation('Datos clínicos registrados correctamente.')
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledTimes(2))
  })
})
