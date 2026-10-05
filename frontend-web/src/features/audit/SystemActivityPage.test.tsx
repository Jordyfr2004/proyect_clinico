import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemActivityPage } from './SystemActivityPage'
import { getRecordedActions, getRecordedSessions, hideRecordedAction } from './auditService'

vi.mock('./auditService', () => ({ getRecordedActions: vi.fn(), getRecordedSessions: vi.fn(), hideRecordedAction: vi.fn() }))
const action = { id: 'action-1', user_id: 'doctor-1', usuario: 'Doctora', rol: 'doctora', modulo: 'agenda', accion: 'crear', detalle: null, visible: true, created_at: '2026-10-04 10:00:00' }
const session = { id: 'session-1', user_id: 'doctor-1', usuario: 'Doctora', rol: 'doctora', accion: 'login', created_at: '2026-10-04 09:00:00' }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getRecordedActions).mockResolvedValue([action]); vi.mocked(getRecordedSessions).mockResolvedValue([session]) })

describe('SystemActivityPage', () => {
  it('loads actions, switches to sessions and filters by date', async () => {
    render(<SystemActivityPage/>)
    expect(await screen.findByText('agenda · crear')).toBeInTheDocument()
    expect(screen.getByText(/4 de octubre de 2026 · 10:00/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sesiones' }))
    expect(await screen.findByText('login')).toBeInTheDocument()
    expect(screen.getByText(/4 de octubre de 2026 · 09:00/)).toBeInTheDocument()
    expect(getRecordedSessions).toHaveBeenCalledWith(undefined)
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-10-03' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar fecha' }))
    await waitFor(() => expect(getRecordedSessions).toHaveBeenLastCalledWith('2026-10-03'))
  })

  it('confirms hiding an action and refetches the visible list', async () => {
    vi.mocked(hideRecordedAction).mockResolvedValue('Acción ocultada.')
    vi.mocked(getRecordedActions).mockResolvedValueOnce([action]).mockResolvedValueOnce([])
    render(<SystemActivityPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Ocultar de la vista' }))
    expect(hideRecordedAction).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Ocultar acción de la vista' })
    expect(dialog).toHaveTextContent('conserva el registro')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(hideRecordedAction).toHaveBeenCalledExactlyOnceWith(action.id))
    expect(await screen.findByText('Sin actividad registrada')).toBeInTheDocument()
    expect(getRecordedActions).toHaveBeenCalledTimes(2)
  })
})
