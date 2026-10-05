import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgendaPage } from './AgendaPage'
import { createMedicalAppointment, createPersonalEntry, getAgendaMonth, getPendingRequests, updateAgendaEntry } from './agendaService'

vi.mock('./agendaService', () => ({ getAgendaMonth: vi.fn(), getPendingRequests: vi.fn(), createMedicalAppointment: vi.fn(), createPersonalEntry: vi.fn(), updateAgendaEntry: vi.fn() }))
const personal = { id: 'personal-1', paciente_id: null, fecha: '2026-10-05', hora_inicio: '10:00', hora_fin: '11:00', tipo: 'personal' as const, descripcion: 'Reunión', estado: null, diagnostico: null, tratamiento: null, observacion: null, paciente: null }
const medical = { ...personal, id: 'medical-1', tipo: 'cita_medica' as const, estado: 'programada' as const, descripcion: 'Control recibido', paciente_id: 'patient-1', paciente: { codigo_paciente: '001', nombres: 'Paciente recibido' } }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getAgendaMonth).mockResolvedValue([personal, medical]) })

function selectOctober() {
  fireEvent.change(screen.getByLabelText('Mes'), { target: { value: '2026-10' } })
}

describe('AgendaPage consultation', () => {
  it('shows only real records for the selected day, without creation or management controls', async () => {
    render(<AgendaPage/>)
    selectOctober()
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledWith(10, 2026))
    expect(screen.queryByRole('button', { name: 'Cita médica' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Actividad personal' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    const day = screen.getByRole('region', { name: '5 de octubre de 2026' })
    expect(day).toHaveTextContent('5 de octubre de 2026')
    expect(await within(day).findByText('2 registros')).toBeInTheDocument()
    expect(day).toHaveTextContent('Reunión')
    expect(day).toHaveTextContent('Control recibido')
    expect(day).toHaveTextContent('Paciente recibido')
    expect(day).toHaveTextContent('10:00–11:00')
    expect(day).toHaveTextContent('Estado: programada')
    expect(within(day).queryByRole('button')).not.toBeInTheDocument()
    expect(getPendingRequests).not.toHaveBeenCalled()
    expect(createMedicalAppointment).not.toHaveBeenCalled()
    expect(createPersonalEntry).not.toHaveBeenCalled()
    expect(updateAgendaEntry).not.toHaveBeenCalled()
  })

  it('clears visual selection when moving to another month', async () => {
    render(<AgendaPage/>)
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    expect(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }))
    expect(screen.getByRole('button', { name: /Seleccionar 1 de noviembre/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('heading', { name: 'Selecciona un día' })).toBeInTheDocument()
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledWith(11, 2026))
  })

  it('keeps an honest empty day and retryable load error', async () => {
    vi.mocked(getAgendaMonth).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('No disponible')).mockResolvedValueOnce([])
    render(<AgendaPage/>)
    selectOctober()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar 5 de octubre/ }))
    expect(await screen.findByText('Sin registros para este día.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible cargar la agenda.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(getAgendaMonth).toHaveBeenCalledTimes(3))
  })
})
