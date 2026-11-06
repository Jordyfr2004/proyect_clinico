import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CashPage } from './CashPage'
import { clearClinicalQueries } from '../../services/clinicalQuery'
import { createExpense, deleteExpense, getCashSummary, updateExpense, type CashMovement, type CashSummary } from './cashService'

vi.mock('./cashService', () => ({ getCashSummary: vi.fn(), createExpense: vi.fn(), updateExpense: vi.fn(), deleteExpense: vi.fn() }))
const income: CashMovement = { id: 'activity-1', tipo: 'ingreso', fecha: '2026-11-05', concepto: 'Limpieza dental', ingreso: '25.00', egreso: '0.00', nombres: 'Paciente', codigo_paciente: '008' }
const expense: CashMovement = { id: 'expense-1', tipo: 'egreso', fecha: '2026-11-04', concepto: 'Compra de guantes', ingreso: '0.00', egreso: '15.00', nombres: null, codigo_paciente: null }
const summary: CashSummary = { periodo: 'dia', ingresos: '25.00', egresos: '15.00', saldo: '10.00', movimientos: [income, expense] }
beforeEach(() => { clearClinicalQueries(); vi.resetAllMocks(); vi.mocked(getCashSummary).mockResolvedValue(summary) })

describe('CashPage', () => {
  it('uses only the current date, week, month and year and shows backend movements', async () => {
    render(<CashPage/>)
    expect(await screen.findByText('Limpieza dental')).toBeInTheDocument()
    expect(screen.getByText('Compra de guantes')).toBeInTheDocument()
    expect(screen.getByText('$10.00')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar Limpieza dental' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar Compra de guantes' })).toBeInTheDocument()
    const today = new Date()
    const fecha = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const periodGroup = screen.getByRole('group', { name: 'Período' })
    for (const [label, params] of [
      ['Hoy', { periodo: 'dia', fecha }],
      ['Semana', { periodo: 'semana', fecha }],
      ['Mes', { periodo: 'mes', mes: today.getMonth() + 1, anio: today.getFullYear() }],
      ['Año', { periodo: 'anio', anio: today.getFullYear() }],
    ] as const) {
      fireEvent.click(within(periodGroup).getByRole('button', { name: label }))
      await waitFor(() => expect(getCashSummary).toHaveBeenCalledWith(params, expect.any(AbortSignal)))
    }
    expect(screen.queryByRole('textbox', { name: 'Fecha' })).not.toBeInTheDocument()
  })

  it('creates an expense with the current date at submit and refreshes totals and movements', async () => {
    vi.mocked(createExpense).mockResolvedValue('Egreso registrado.')
    vi.mocked(getCashSummary).mockResolvedValueOnce(summary).mockResolvedValue({ ...summary, egresos: '20.00', saldo: '5.00', movimientos: [...summary.movimientos, { ...expense, id: 'expense-2' }] })
    render(<CashPage/>)
    await screen.findByText('Limpieza dental')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar egreso' }))
    const form = screen.getByRole('form', { name: 'Datos del egreso' })
    expect(within(form).queryByDisplayValue(/2026/)).not.toBeInTheDocument()
    expect(within(form).queryByLabelText('Fecha')).not.toBeInTheDocument()
    expect(within(form).getByTestId('expense-date')).toBeInTheDocument()
    fireEvent.change(within(form).getByLabelText('Concepto'), { target: { value: 'Material' } })
    fireEvent.change(within(form).getByLabelText('Monto'), { target: { value: '5.00' } })
    fireEvent.submit(form)
    const now = new Date()
    const fecha = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    await waitFor(() => expect(createExpense).toHaveBeenCalledExactlyOnceWith({ fecha, concepto: 'Material', monto: 5 }))
    expect(await screen.findByText('$5.00')).toBeInTheDocument()
    expect(getCashSummary).toHaveBeenCalledTimes(2)
  })

  it('edits only concept and amount, keeps the original date, and confirms deletion', async () => {
    vi.mocked(updateExpense).mockResolvedValue('Egreso actualizado.')
    vi.mocked(deleteExpense).mockResolvedValue('Egreso eliminado.')
    render(<CashPage/>)
    await screen.findByText('Compra de guantes')
    fireEvent.click(screen.getByRole('button', { name: 'Editar Compra de guantes' }))
    const form = screen.getByRole('form', { name: 'Datos del egreso' })
    expect(within(form).getByTestId('expense-date')).toHaveTextContent('4 de noviembre de 2026')
    expect(within(form).queryByLabelText('Fecha')).not.toBeInTheDocument()
    fireEvent.change(within(form).getByLabelText('Concepto'), { target: { value: 'Guantes' } })
    fireEvent.change(within(form).getByLabelText('Monto'), { target: { value: '12.50' } })
    fireEvent.submit(form)
    await waitFor(() => expect(updateExpense).toHaveBeenCalledExactlyOnceWith('expense-1', { concepto: 'Guantes', monto: 12.5 }))
    await waitFor(() => expect(getCashSummary).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Compra de guantes' }))
    expect(deleteExpense).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Eliminar egreso' })).getByRole('button', { name: 'Confirmar eliminación' }))
    await waitFor(() => expect(deleteExpense).toHaveBeenCalledExactlyOnceWith('expense-1'))
    await waitFor(() => expect(getCashSummary).toHaveBeenCalledTimes(3))
  })

  it('shows a write error and prevents duplicate submissions', async () => {
    let rejectSave: (reason: Error) => void = () => {}
    vi.mocked(createExpense).mockImplementation(() => new Promise((_resolve, reject) => { rejectSave = reject }))
    render(<CashPage/>)
    await screen.findByText('Limpieza dental')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar egreso' }))
    const form = screen.getByRole('form', { name: 'Datos del egreso' })
    fireEvent.change(within(form).getByLabelText('Concepto'), { target: { value: 'Guantes' } })
    fireEvent.change(within(form).getByLabelText('Monto'), { target: { value: '15' } })
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(createExpense).toHaveBeenCalledTimes(1)
    rejectSave(new Error('network'))
    expect(await within(form).findByRole('alert')).toHaveTextContent('No fue posible completar la operación')
    expect(screen.getByRole('dialog', { name: 'Registrar egreso' })).toBeInTheDocument()
  })

  it('handles empty and failed reports', async () => {
    vi.mocked(getCashSummary).mockResolvedValueOnce({ ...summary, movimientos: [] })
    const view = render(<CashPage/>)
    expect(await screen.findByText('Sin movimientos')).toBeInTheDocument()
    view.unmount()
    clearClinicalQueries()
    vi.mocked(getCashSummary).mockRejectedValue(new Error('network'))
    render(<CashPage/>)
    expect(await screen.findByText(/No fue posible completar la operación/)).toBeInTheDocument()
  })
})
