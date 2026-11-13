import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CashPage } from './CashPage'
import { clearClinicalQueries } from '../../services/clinicalQuery'
import { clearClinicalViewState } from '../../services/clinicalViewState'
import { createExpense, deleteExpense, getCashSummary, updateExpense, type CashMovement, type CashSummary } from './cashService'

vi.mock('./cashService', () => ({ getCashSummary: vi.fn(), createExpense: vi.fn(), updateExpense: vi.fn(), deleteExpense: vi.fn() }))
const income: CashMovement = { id: 'activity-1', tipo: 'ingreso', fecha: '2026-11-05', concepto: 'Limpieza dental', ingreso: '25.00', egreso: '0.00', nombres: 'Paciente', codigo_paciente: '008' }
const expense: CashMovement = { id: 'expense-1', tipo: 'egreso', fecha: '2026-11-04', concepto: 'Compra de guantes', ingreso: '0.00', egreso: '15.00', nombres: null, codigo_paciente: null }
const summary: CashSummary = { periodo: 'dia', ingresos: '25.00', egresos: '15.00', saldo: '10.00', movimientos: [income, expense] }
const renderCash = () => render(<MemoryRouter><CashPage/></MemoryRouter>)
const expenseMenu = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Opciones de egreso para Compra de guantes' }))
  return screen.findByRole('menu')
}
beforeEach(() => { clearClinicalQueries(); clearClinicalViewState(); vi.resetAllMocks(); vi.mocked(getCashSummary).mockResolvedValue(summary) })

describe('CashPage', () => {
  it('opens expense registration from the Dashboard action', async () => {
    render(<MemoryRouter initialEntries={[{ pathname: '/caja', state: { dashboardAction: 'registrar-egreso' } }]}><CashPage/></MemoryRouter>)
    expect(await screen.findByRole('form', { name: 'Datos del egreso' })).toBeInTheDocument()
  })

  it('uses Laravel totals, permits historical periods, and never offers income actions', async () => {
    renderCash()
    expect(await screen.findByText('Limpieza dental')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Resumen de Caja' })).getByText('$10.00')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Opciones de ingreso/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Opciones de egreso/ })).toHaveLength(1)
    const group = screen.getByRole('group', { name: 'Período' })
    fireEvent.change(screen.getByLabelText('Fecha del reporte'), { target: { value: '2025-03-04' } })
    expect(screen.getByText('Cambios sin aplicar')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    await waitFor(() => expect(getCashSummary).toHaveBeenCalledWith({ periodo: 'dia', fecha: '2025-03-04' }, expect.any(AbortSignal)))
    expect(screen.getByText(/Período consultado:/)).toHaveTextContent('4 de marzo de 2025')
    fireEvent.click(within(group).getByRole('button', { name: 'Semana' }))
    await waitFor(() => expect(getCashSummary).toHaveBeenCalledWith({ periodo: 'semana', fecha: '2025-03-04' }, expect.any(AbortSignal)))
    fireEvent.click(within(group).getByRole('button', { name: 'Mes' }))
    fireEvent.change(screen.getByLabelText('Mes del reporte'), { target: { value: '2024-02' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    await waitFor(() => expect(getCashSummary).toHaveBeenCalledWith({ periodo: 'mes', mes: 2, anio: 2024 }, expect.any(AbortSignal)))
    fireEvent.click(within(group).getByRole('button', { name: 'Año' }))
    fireEvent.change(screen.getByLabelText('Año del reporte'), { target: { value: '2023' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    await waitFor(() => expect(getCashSummary).toHaveBeenCalledWith({ periodo: 'anio', anio: 2023 }, expect.any(AbortSignal)))
    fireEvent.click(screen.getByRole('button', { name: 'Ir al período actual' }))
    const now = new Date()
    await waitFor(() => expect(getCashSummary).toHaveBeenCalledWith({ periodo: 'dia', fecha: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` }, expect.any(AbortSignal)))
  })

  it('creates with today’s date, accepts cents, rejects excess decimals, and refreshes totals', async () => {
    vi.mocked(createExpense).mockResolvedValue('Egreso registrado.')
    vi.mocked(getCashSummary).mockResolvedValueOnce(summary).mockResolvedValue({ ...summary, egresos: '20.00', saldo: '5.00', movimientos: [...summary.movimientos, { ...expense, id: 'expense-2' }] })
    renderCash(); await screen.findByText('Limpieza dental')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar egreso' }))
    const form = screen.getByRole('form', { name: 'Datos del egreso' })
    expect(within(form).queryByLabelText('Fecha')).not.toBeInTheDocument()
    expect(within(form).getByTestId('expense-date')).toBeInTheDocument()
    fireEvent.change(within(form).getByLabelText('Concepto'), { target: { value: 'Material' } })
    fireEvent.change(within(form).getByLabelText('Monto (USD)'), { target: { value: '5.999' } })
    fireEvent.submit(form)
    expect(createExpense).not.toHaveBeenCalled()
    expect(within(form).getByRole('alert')).toHaveTextContent('máximo dos decimales')
    fireEvent.change(within(form).getByLabelText('Monto (USD)'), { target: { value: '5.00' } })
    fireEvent.submit(form)
    const now = new Date()
    await waitFor(() => expect(createExpense).toHaveBeenCalledExactlyOnceWith({ fecha: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, concepto: 'Material', monto: 5 }))
    expect(await screen.findByText('$5.00')).toBeInTheDocument()
    expect(getCashSummary).toHaveBeenCalledTimes(2)
  })

  it('edits only concept and amount and confirms deletion with original details', async () => {
    vi.mocked(updateExpense).mockResolvedValue('Egreso actualizado.')
    vi.mocked(deleteExpense).mockResolvedValue('Egreso eliminado.')
    renderCash(); await screen.findByText('Compra de guantes')
    fireEvent.click(within(await expenseMenu()).getByRole('menuitem', { name: 'Editar' }))
    const form = screen.getByRole('form', { name: 'Datos del egreso' })
    expect(within(form).getByTestId('expense-date')).toHaveTextContent('4 de noviembre de 2026')
    expect(within(form).getByLabelText('Monto (USD)')).toHaveValue(15)
    fireEvent.change(within(form).getByLabelText('Concepto'), { target: { value: 'Guantes' } })
    fireEvent.change(within(form).getByLabelText('Monto (USD)'), { target: { value: '12.50' } })
    fireEvent.submit(form)
    await waitFor(() => expect(updateExpense).toHaveBeenCalledExactlyOnceWith('expense-1', { concepto: 'Guantes', monto: 12.5 }))
    await waitFor(() => expect(getCashSummary).toHaveBeenCalledTimes(2))
    fireEvent.click(within(await expenseMenu()).getByRole('menuitem', { name: 'Eliminar' }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminar egreso' })
    expect(dialog).toHaveTextContent('Compra de guantes')
    expect(dialog).toHaveTextContent('4 de noviembre de 2026')
    expect(dialog).toHaveTextContent('$15.00')
    expect(deleteExpense).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar eliminación' }))
    await waitFor(() => expect(deleteExpense).toHaveBeenCalledExactlyOnceWith('expense-1'))
  })

  it('keeps entered data on a write error and prevents duplicate submissions', async () => {
    let rejectSave: (reason: Error) => void = () => {}
    vi.mocked(createExpense).mockImplementation(() => new Promise((_resolve, reject) => { rejectSave = reject }))
    renderCash(); await screen.findByText('Limpieza dental')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar egreso' }))
    const form = screen.getByRole('form', { name: 'Datos del egreso' })
    fireEvent.change(within(form).getByLabelText('Concepto'), { target: { value: 'Guantes' } })
    fireEvent.change(within(form).getByLabelText('Monto (USD)'), { target: { value: '15' } })
    fireEvent.submit(form); fireEvent.submit(form)
    expect(createExpense).toHaveBeenCalledTimes(1)
    rejectSave(new Error('network'))
    expect(await within(form).findByRole('alert')).toHaveTextContent('No fue posible completar la operación')
    expect(within(form).getByLabelText('Concepto')).toHaveValue('Guantes')
    expect(within(form).getByLabelText('Monto (USD)')).toHaveValue(15)
  })

  it('shows compact empty and error states', async () => {
    vi.mocked(getCashSummary).mockResolvedValueOnce({ ...summary, movimientos: [] })
    const view = renderCash()
    expect(await screen.findByText('Sin movimientos en este período')).toBeInTheDocument()
    view.unmount(); clearClinicalQueries(); clearClinicalViewState()
    vi.mocked(getCashSummary).mockRejectedValue(new Error('network'))
    renderCash()
    expect(await screen.findByText(/No fue posible completar la operación/)).toBeInTheDocument()
  })
})
