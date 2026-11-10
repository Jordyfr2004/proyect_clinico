import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../auth/authContext'
import type { UserRole } from '../auth/authService'
import { ActivitiesPage } from './ActivitiesPage'
import { createActivity, deleteActivity, getActivities, getActivityTotal, lookupPatientByCode, updateActivity } from './activityService'

vi.mock('./activityService', () => ({ getActivities: vi.fn(), getActivityTotal: vi.fn(), lookupPatientByCode: vi.fn(), createActivity: vi.fn(), updateActivity: vi.fn(), deleteActivity: vi.fn() }))
const record = { id: 'activity-id', paciente_id: 'patient-id', fecha: '2026-10-05', actividad: 'Consulta registrada', precio: '25.00', paciente: { codigo_paciente: '001', nombres: 'Paciente recibido' } }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getActivities).mockResolvedValue([record]); vi.mocked(getActivityTotal).mockResolvedValue({ periodo: 'mes', total: '25.00' }); vi.mocked(lookupPatientByCode).mockResolvedValue(record.paciente) })
function renderPage(role: UserRole, dashboardAction?: string) { render(<AuthContext.Provider value={{ status: 'authenticated', user: { id: 'user-id', name: 'Personal', username: 'personal', role, paciente_id: null, activo: true }, sessionError: null, login: async () => {}, logout: async () => {} }}><MemoryRouter initialEntries={[{ pathname: '/actividades', state: dashboardAction ? { dashboardAction } : null }]}><ActivitiesPage/></MemoryRouter></AuthContext.Provider>) }

describe('ActivitiesPage', () => {
  it('opens registration from the Dashboard action only for a doctor', async () => {
    renderPage('doctora', 'registrar-actividad')
    expect(await screen.findByRole('dialog', { name: 'Registrar actividad' })).toBeInTheDocument()
  })

  it('ignores a registration action for an assistant', async () => {
    renderPage('asistente', 'registrar-actividad')
    expect(await screen.findByText('Consulta registrada')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps a large server result accessible without mounting every row at once', async () => {
    vi.mocked(getActivities).mockResolvedValue(Array.from({ length: 120 }, (_, index) => ({ ...record, id: `activity-${index}`, actividad: `Actividad ${index}` })))
    renderPage('asistente')
    expect(await screen.findByText('Actividad 0')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 50 de 120 registros recibidos')).toBeInTheDocument()
    expect(screen.queryByText('Actividad 119')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar más registros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar más registros' }))
    expect(screen.getByText('Actividad 119')).toBeInTheDocument()
    expect(getActivities).toHaveBeenCalledTimes(1)
  })

  it('keeps received activities visible when only the period total fails', async () => {
    vi.mocked(getActivityTotal).mockRejectedValue(new Error('network'))
    renderPage('doctora')
    expect(await screen.findByText('Consulta registrada')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('No fue posible completar la operación.')
    expect(screen.queryByText('Total general del período')).not.toBeInTheDocument()
  })

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
    expect(screen.queryByRole('button', { name: /Opciones de actividad/ })).not.toBeInTheDocument()
  })

  it('opens the doctor action menu by keyboard and closes it with Escape', async () => {
    renderPage('doctora')
    await screen.findByText('Consulta registrada')
    const trigger = screen.getByRole('button', { name: 'Opciones de actividad para Paciente recibido' })
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Editar' }), { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('keeps first and last action menus outside the scrolling list and closes on outside click', async () => {
    vi.mocked(getActivities).mockResolvedValue(Array.from({ length: 3 }, (_, index) => ({ ...record, id: `activity-${index}`, paciente: { ...record.paciente, nombres: `Paciente ${index}` } })))
    renderPage('doctora')
    await screen.findByText('Paciente 0')
    const list = screen.getByRole('region', { name: 'Lista de actividades' })
    const first = screen.getByRole('button', { name: 'Opciones de actividad para Paciente 0' })
    fireEvent.click(first)
    expect(list).not.toContainElement(screen.getByRole('menu'))
    expect(document.body).toContainElement(screen.getByRole('menu'))
    fireEvent.pointerDown(screen.getByRole('heading', { name: 'Actividades' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    fireEvent.scroll(list, { target: { scrollTop: 500 } })
    const last = screen.getByRole('button', { name: 'Opciones de actividad para Paciente 2' })
    fireEvent.click(last)
    expect(list).not.toContainElement(screen.getByRole('menu'))
    fireEvent.keyDown(last, { key: 'ArrowDown' })
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Editar' }), { key: 'Escape' })
    expect(last).toHaveFocus()
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

  it('ignores a lookup result after the patient code changes', async () => {
    let finishLookup!: (value: typeof record.paciente) => void
    vi.mocked(lookupPatientByCode).mockReturnValue(new Promise((resolve) => { finishLookup = resolve }))
    renderPage('doctora')
    await screen.findByText('Consulta registrada')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar actividad' }))
    const code = screen.getByLabelText('Código de paciente')
    fireEvent.change(code, { target: { value: '001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar paciente' }))
    fireEvent.change(code, { target: { value: '002' } })
    finishLookup(record.paciente)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Buscar paciente' })).toBeEnabled())
    expect(within(screen.getByRole('dialog')).queryByRole('status')).not.toBeInTheDocument()
  })

  it('keeps the newest lookup loading and ignores an older result that arrives first', async () => {
    let resolveFirst!: (value: typeof record.paciente) => void
    let resolveSecond!: (value: typeof record.paciente) => void
    vi.mocked(lookupPatientByCode)
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve }))
    renderPage('doctora')
    await screen.findByText('Consulta registrada')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar actividad' }))
    const dialog = screen.getByRole('dialog')
    const code = within(dialog).getByLabelText('Código de paciente')
    const search = within(dialog).getByRole('button', { name: 'Buscar paciente' })
    fireEvent.change(code, { target: { value: '001' } })
    fireEvent.click(search)
    fireEvent.change(code, { target: { value: '002' } })
    fireEvent.click(search)
    expect(lookupPatientByCode).toHaveBeenNthCalledWith(2, '002')
    resolveFirst(record.paciente)
    await waitFor(() => expect(within(dialog).queryByText('Paciente recibido')).not.toBeInTheDocument())
    expect(search).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Guardar' })).toBeDisabled()
    resolveSecond({ codigo_paciente: '002', nombres: 'Paciente nuevo' })
    expect(await within(dialog).findByText('Paciente nuevo')).toBeInTheDocument()
    expect(search).toBeEnabled()
  })

  it('ignores an older lookup error after a newer result succeeds', async () => {
    let rejectFirst!: (reason: unknown) => void
    let resolveSecond!: (value: typeof record.paciente) => void
    vi.mocked(lookupPatientByCode)
      .mockReturnValueOnce(new Promise((_, reject) => { rejectFirst = reject }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve }))
    renderPage('doctora')
    await screen.findByText('Consulta registrada')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar actividad' }))
    const dialog = screen.getByRole('dialog')
    const code = within(dialog).getByLabelText('Código de paciente')
    const search = within(dialog).getByRole('button', { name: 'Buscar paciente' })
    fireEvent.change(code, { target: { value: '001' } })
    fireEvent.click(search)
    fireEvent.change(code, { target: { value: '002' } })
    fireEvent.click(search)
    resolveSecond({ codigo_paciente: '002', nombres: 'Paciente nuevo' })
    expect(await within(dialog).findByText('Paciente nuevo')).toBeInTheDocument()
    rejectFirst(new Error('old request failed'))
    await waitFor(() => expect(search).toBeEnabled())
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(within(dialog).getByText('Paciente nuevo')).toBeInTheDocument()
  })

  it('exposes real period filters and keeps the total general when filtering a patient', async () => {
    renderPage('doctora')
    await screen.findByText('Consulta registrada')
    fireEvent.change(screen.getByLabelText('Código de paciente para filtrar'), { target: { value: '001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(getActivities).toHaveBeenCalledWith(expect.objectContaining({ codigo_paciente: '001' }), expect.any(AbortSignal)))
    expect(screen.getByText('Total general del período')).toBeInTheDocument()
    expect(getActivityTotal).not.toHaveBeenCalledWith(expect.objectContaining({ codigo_paciente: '001' }))
    expect(screen.getByText('Incluye todas las actividades del período, aunque filtres por paciente.')).toBeInTheDocument()
  })

  it('shows only the fields for the selected period and clears applied filters', async () => {
    renderPage('doctora')
    await screen.findByText('Consulta registrada')
    fireEvent.click(screen.getByRole('button', { name: 'Semana' }))
    expect(screen.getByLabelText('Fecha de la semana')).toBeInTheDocument()
    expect(screen.queryByLabelText('Mes')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Código de paciente para filtrar'), { target: { value: '001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(getActivities).toHaveBeenCalledWith(expect.objectContaining({ semana: expect.any(String), codigo_paciente: '001' }), expect.any(AbortSignal)))
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(screen.getByRole('button', { name: 'Mes' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Código de paciente para filtrar')).toHaveValue('')
    await waitFor(() => expect(getActivities).toHaveBeenCalledWith(expect.objectContaining({ mes: expect.any(Number), anio: expect.any(Number) }), expect.any(AbortSignal)))
  })

  it('distinguishes pending filters from the period actually queried', async () => {
    renderPage('asistente')
    await screen.findByText('Consulta registrada')
    fireEvent.change(screen.getByLabelText('Mes'), { target: { value: '11' } })
    fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(await screen.findByText('Período consultado: noviembre de 2026')).toBeInTheDocument()
    expect(screen.queryByText('Cambios sin aplicar')).not.toBeInTheDocument()

    const callsAfterApply = vi.mocked(getActivities).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Día' }))
    fireEvent.change(screen.getByLabelText('Fecha del día'), { target: { value: '2026-11-10' } })
    expect(screen.getByText('Cambios sin aplicar')).toBeInTheDocument()
    expect(screen.getByText('Período consultado: noviembre de 2026')).toBeInTheDocument()
    expect(getActivities).toHaveBeenCalledTimes(callsAfterApply)

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(await screen.findByText('Período consultado: 10 de noviembre de 2026')).toBeInTheDocument()
    expect(screen.queryByText('Cambios sin aplicar')).not.toBeInTheDocument()
    await waitFor(() => expect(getActivities).toHaveBeenCalledWith(expect.objectContaining({ fecha: '2026-11-10' }), expect.any(AbortSignal)))

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(screen.queryByText('Cambios sin aplicar')).not.toBeInTheDocument()
    const currentMonth = new Intl.DateTimeFormat('es-EC', { month: 'long' }).format(new Date())
    expect(screen.getByText(`Período consultado: ${currentMonth} de ${new Date().getFullYear()}`)).toBeInTheDocument()
  })

  it('edits a received activity and reloads the backend list', async () => {
    vi.mocked(updateActivity).mockResolvedValue('Actividad actualizada correctamente.')
    renderPage('doctora')
    await screen.findByText('Consulta registrada')
    fireEvent.click(screen.getByRole('button', { name: 'Opciones de actividad para Paciente recibido' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Opciones de actividad para Paciente recibido' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Opciones de actividad para Paciente recibido' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }))
    expect(deleteActivity).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Eliminar actividad' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar eliminación' }))
    await waitFor(() => expect(deleteActivity).toHaveBeenCalledExactlyOnceWith('activity-id'))
    await waitFor(() => expect(getActivities).toHaveBeenCalledTimes(2))
  })
})
