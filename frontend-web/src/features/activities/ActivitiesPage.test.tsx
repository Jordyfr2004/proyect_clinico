import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/authContext'
import type { UserRole } from '../auth/authService'
import { ActivitiesPage } from './ActivitiesPage'
import { createActivity, deleteActivity, getActivities, getActivityTotal, lookupPatientByCode, updateActivity } from './activityService'

vi.mock('./activityService', () => ({ getActivities: vi.fn(), getActivityTotal: vi.fn(), lookupPatientByCode: vi.fn(), createActivity: vi.fn(), updateActivity: vi.fn(), deleteActivity: vi.fn() }))
const record = { id: 'activity-id', paciente_id: 'patient-id', fecha: '2026-10-05', actividad: 'Consulta registrada', precio: '25.00', paciente: { codigo_paciente: '001', nombres: 'Paciente recibido' } }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getActivities).mockResolvedValue([record]); vi.mocked(getActivityTotal).mockResolvedValue({ periodo: 'mes', total: '25.00' }); vi.mocked(lookupPatientByCode).mockResolvedValue(record.paciente) })
function renderPage(role: UserRole) { render(<AuthContext.Provider value={{ status: 'authenticated', user: { id: 'user-id', name: 'Personal', username: 'personal', role, paciente_id: null, activo: true }, sessionError: null, login: async () => {}, logout: async () => {} }}><ActivitiesPage/></AuthContext.Provider>) }

describe('ActivitiesPage', () => {
  it('shows backend records and the backend period total without granting write to assistant', async () => {
    vi.mocked(getActivityTotal).mockResolvedValue({ periodo: 'mes', total: '40.50' })
    renderPage('asistente')
    expect(await screen.findByText('Consulta registrada')).toBeInTheDocument()
    expect(screen.getByText('Paciente recibido')).toBeInTheDocument()
    expect(screen.getByText('5 de octubre de 2026')).toBeInTheDocument()
    expect(screen.getByText('$25.00')).toBeInTheDocument()
    expect(screen.getByText('$40.50')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'enero' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'diciembre' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar actividad' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })

  it('uses a real patient lookup and refreshes list and total after creating', async () => {
    vi.mocked(createActivity).mockResolvedValue('Actividad registrada correctamente.')
    renderPage('doctora')
    await screen.findByText('Consulta registrada')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar actividad' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar actividad' })
    fireEvent.change(within(dialog).getByLabelText('Código de paciente'), { target: { value: '001' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Buscar paciente' }))
    expect(await within(dialog).findByText('Paciente recibido')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Fecha'), { target: { value: '2026-10-05' } })
    fireEvent.change(within(dialog).getByLabelText('Actividad'), { target: { value: 'Consulta' } })
    fireEvent.change(within(dialog).getByLabelText('Precio'), { target: { value: '25' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(createActivity).toHaveBeenCalledWith({ codigo_paciente: '001', fecha: '2026-10-05', actividad: 'Consulta', precio: 25 }))
    await waitFor(() => expect(getActivities).toHaveBeenCalledTimes(2))
    expect(getActivityTotal).toHaveBeenCalledTimes(2)
  })

  it('shows a 404 patient lookup without sending a mutation', async () => {
    vi.mocked(lookupPatientByCode).mockRejectedValue({ isAxiosError: true, response: { status: 404, data: { message: 'Paciente no encontrado.' } } })
    renderPage('doctora')
    await screen.findByText('Consulta registrada')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar actividad' }))
    fireEvent.change(screen.getByLabelText('Código de paciente'), { target: { value: '999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar paciente' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Paciente no encontrado.')
    expect(createActivity).not.toHaveBeenCalled()
  })

  it('exposes real period filters and keeps the total general when filtering a patient', async () => {
    renderPage('doctora')
    await screen.findByText('Consulta registrada')
    fireEvent.change(screen.getByLabelText('Código de paciente para filtrar'), { target: { value: '001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(getActivities).toHaveBeenCalledWith(expect.objectContaining({ codigo_paciente: '001' })))
    expect(screen.getByText('Total general del período')).toBeInTheDocument()
    expect(getActivityTotal).not.toHaveBeenCalledWith(expect.objectContaining({ codigo_paciente: '001' }))
  })

  it('edits a received activity and reloads the backend list', async () => {
    vi.mocked(updateActivity).mockResolvedValue('Actividad actualizada correctamente.')
    renderPage('doctora')
    await screen.findByText('Consulta registrada')
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar actividad' })
    fireEvent.change(within(dialog).getByLabelText('Actividad'), { target: { value: 'Control' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(updateActivity).toHaveBeenCalledWith('activity-id', { codigo_paciente: '001', fecha: '2026-10-05', actividad: 'Control', precio: 25 }))
    await waitFor(() => expect(getActivities).toHaveBeenCalledTimes(2))
  })

  it('keeps the dialog open and avoids a false success when refresh fails after a confirmed edit', async () => {
    vi.mocked(getActivities).mockResolvedValueOnce([record]).mockRejectedValueOnce(new Error('network'))
    vi.mocked(updateActivity).mockResolvedValue('Actividad actualizada correctamente.')
    renderPage('doctora')
    await screen.findByText('Consulta registrada')
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar actividad' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('El cambio se confirmó, pero no fue posible actualizar las actividades.')
    expect(screen.queryByText('Actividad actualizada correctamente.')).not.toBeInTheDocument()
    expect(getActivities).toHaveBeenCalledTimes(2)
  })

  it('requires confirmation before deleting and reloads after success', async () => {
    vi.mocked(deleteActivity).mockResolvedValue('Actividad eliminada correctamente.')
    renderPage('doctora')
    await screen.findByText('Consulta registrada')
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    expect(deleteActivity).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Eliminar actividad' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar eliminación' }))
    await waitFor(() => expect(deleteActivity).toHaveBeenCalledExactlyOnceWith('activity-id'))
    await waitFor(() => expect(getActivities).toHaveBeenCalledTimes(2))
  })
})
