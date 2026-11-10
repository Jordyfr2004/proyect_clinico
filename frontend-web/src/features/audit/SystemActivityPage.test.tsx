import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { SystemActivityPage } from './SystemActivityPage'
import { getRecordedActions, getRecordedSessions, hideRecordedAction } from './auditService'

vi.mock('./auditService', () => ({ getRecordedActions: vi.fn(), getRecordedSessions: vi.fn(), hideRecordedAction: vi.fn() }))
const action = { id: 'action-1', user_id: 'doctor-1', usuario: 'Doctora', rol: 'doctora', modulo: 'agenda', accion: 'crear', detalle: null, visible: true, created_at: '2026-10-04 10:00:00' }
const session = { id: 'session-1', user_id: 'doctor-1', usuario: 'Doctora', rol: 'doctora', accion: 'login', created_at: '2026-10-04 09:00:00' }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getRecordedActions).mockResolvedValue([action]); vi.mocked(getRecordedSessions).mockResolvedValue([session]) })

describe('SystemActivityPage', () => {
  it('shows searchable real settings without loading audit records on the landing page', async () => {
    render(<MemoryRouter><SystemActivityPage/></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Configuración' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Actividad del sistema/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sesiones/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Categorías y servicios/ })).toHaveAttribute('href', '/servicios')
    expect(getRecordedActions).not.toHaveBeenCalled()
    expect(getRecordedSessions).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar en configuración' }), { target: { value: 'sesiones' } })
    expect(screen.queryByRole('button', { name: /Actividad del sistema/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Sesiones/ }))
    expect(await screen.findByText('login')).toBeInTheDocument()
    expect(getRecordedSessions).toHaveBeenCalledOnce()
    expect(getRecordedActions).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a Configuración' }))
    expect(screen.getByRole('heading', { name: 'Configuración' })).toBeInTheDocument()
  })

  it('bounds the DOM for complete audit responses without dropping records', async () => {
    vi.mocked(getRecordedActions).mockResolvedValue(Array.from({ length: 120 }, (_, index) => ({ ...action, id: `action-${index}`, accion: `acción ${index}` })))
    render(<MemoryRouter><SystemActivityPage/></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /Actividad del sistema/ }))
    expect(await screen.findByText('agenda · acción 0')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 50 de 120 registros recibidos')).toBeInTheDocument()
    expect(screen.queryByText('agenda · acción 119')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar más registros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar más registros' }))
    expect(screen.getByText('agenda · acción 119')).toBeInTheDocument()
    expect(getRecordedActions).toHaveBeenCalledTimes(1)
  })

  it('loads actions, switches to sessions and filters by date', async () => {
    render(<MemoryRouter><SystemActivityPage/></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /Actividad del sistema/ }))
    expect(await screen.findByText('agenda · crear')).toBeInTheDocument()
    expect(screen.getByText(/4 de octubre de 2026 · 10:00/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sesiones' }))
    expect(await screen.findByText('login')).toBeInTheDocument()
    expect(screen.getByText(/4 de octubre de 2026 · 09:00/)).toBeInTheDocument()
    expect(getRecordedSessions).toHaveBeenCalledWith(undefined, expect.any(AbortSignal))
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-10-03' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar fecha' }))
    await waitFor(() => expect(getRecordedSessions).toHaveBeenLastCalledWith('2026-10-03', expect.any(AbortSignal)))
  })

  it('confirms hiding an action and refetches the visible list', async () => {
    vi.mocked(hideRecordedAction).mockResolvedValue('Acción ocultada.')
    vi.mocked(getRecordedActions).mockResolvedValueOnce([action]).mockResolvedValueOnce([])
    render(<MemoryRouter><SystemActivityPage/></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /Actividad del sistema/ }))
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
