import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/authContext'
import { ChangeHistorySection } from './ChangeHistorySection'
import { getChangeHistory } from './changeHistoryService'

vi.mock('./changeHistoryService', () => ({ getChangeHistory: vi.fn() }))
const change = { id: 7, fecha: '2026-11-23T10:00:00-05:00', esquema: 'clinica', tabla: 'pacientes', registro_id: 'patient-7', operacion: 'DELETE' as const, usuario_id: null, usuario: null, rol: null, campos_modificados: [], datos_anteriores: { nombres: 'Dato anterior', optional: null }, datos_nuevos: null }
function show(role: 'doctora' | 'asistente' = 'doctora') {
  return render(<AuthContext.Provider value={{ status: 'authenticated', user: { id: 'staff', name: 'Personal', username: 'personal', role, paciente_id: null, activo: true }, sessionError: null, login: async () => {}, logout: async () => {} }}><ChangeHistorySection/></AuthContext.Provider>)
}
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getChangeHistory).mockResolvedValue([change]) })
describe('change history', () => {
  it('shows deleted rows with JSON details and filters only on submission', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: /Ver cambio/ }))
    const panel = screen.getByRole('dialog', { name: 'Detalle del cambio' })
    expect(within(panel).getByText(/Dato anterior/)).toBeInTheDocument()
    expect(within(panel).getByText('Sin valores posteriores')).toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: 'Cerrar diálogo' }))
    fireEvent.change(screen.getByLabelText('Tabla'), { target: { value: 'pacientes' } })
    expect(getChangeHistory).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(getChangeHistory).toHaveBeenLastCalledWith({ tabla: 'pacientes' }, expect.any(AbortSignal)))
    expect(screen.getByText(/Máximo 200/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /página siguiente/i })).not.toBeInTheDocument()
  })
  it('does not request doctor data for an assistant even when mounted directly', () => {
    show('asistente')
    expect(getChangeHistory).not.toHaveBeenCalled()
    expect(screen.getByText('Acceso exclusivo de doctora.')).toBeInTheDocument()
  })
  it('shows an error and allows retry without presenting failure as an empty history', async () => {
    vi.mocked(getChangeHistory).mockRejectedValue(new Error('offline'))
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible cargar el historial de cambios.')
    expect(screen.queryByText('Sin cambios registrados')).not.toBeInTheDocument()
  })
})
