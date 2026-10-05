import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CashPage } from './CashPage'
import { createExpense, deleteExpense, getCashSummary, getExpenses, updateExpense } from './cashService'

vi.mock('./cashService', () => ({ getCashSummary: vi.fn(), getExpenses: vi.fn(), createExpense: vi.fn(), updateExpense: vi.fn(), deleteExpense: vi.fn() }))
const summary = { periodo: 'mes' as const, ingresos: '200.00', egresos: '60.00', saldo: '140.00' }
const expense = { id: 'expense-1', fecha: '2026-10-04', concepto: 'Material recibido', monto: '60.00' }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getCashSummary).mockResolvedValue(summary); vi.mocked(getExpenses).mockResolvedValue([expense]) })

describe('CashPage', () => {
  it('displays totals from backend and sends selected filters', async () => {
    render(<CashPage/>)
    expect(await screen.findByText('140.00')).toBeInTheDocument()
    expect(screen.getByText('200.00')).toBeInTheDocument()
    const filterArea = screen.getByRole('region', { name: 'Filtros de Caja' })
    fireEvent.change(within(filterArea).getByLabelText('Período'), { target: { value: 'dia' } })
    fireEvent.change(within(filterArea).getByLabelText('Fecha'), { target: { value: '2026-10-03' } })
    fireEvent.click(within(filterArea).getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(getCashSummary).toHaveBeenLastCalledWith({ periodo: 'dia', fecha: '2026-10-03' }))
    expect(getExpenses).toHaveBeenLastCalledWith({ fecha: '2026-10-03' })
  })

  it('creates an expense and refreshes summary and list', async () => {
    vi.mocked(createExpense).mockResolvedValue('Egreso registrado.')
    render(<CashPage/>)
    await screen.findByText('Material recibido')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar egreso' }))
    const form = screen.getByRole('form', { name: 'Datos del egreso' })
    fireEvent.change(within(form).getByLabelText('Fecha'), { target: { value: '2026-10-04' } })
    fireEvent.change(within(form).getByLabelText('Concepto'), { target: { value: 'Concepto confirmado' } })
    fireEvent.change(within(form).getByLabelText('Monto'), { target: { value: '12.50' } })
    fireEvent.submit(form)
    await waitFor(() => expect(createExpense).toHaveBeenCalledExactlyOnceWith({ fecha: '2026-10-04', concepto: 'Concepto confirmado', monto: 12.5 }))
    await waitFor(() => expect(getCashSummary).toHaveBeenCalledTimes(2))
    expect(getExpenses).toHaveBeenCalledTimes(2)
  })

  it('edits and deletes with backend refetches and deletion confirmation', async () => {
    vi.mocked(updateExpense).mockResolvedValue('Egreso actualizado.')
    vi.mocked(deleteExpense).mockResolvedValue('Egreso eliminado.')
    render(<CashPage/>)
    await screen.findByText('Material recibido')
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    const form = screen.getByRole('form', { name: 'Datos del egreso' })
    fireEvent.change(within(form).getByLabelText('Concepto'), { target: { value: 'Concepto corregido' } })
    fireEvent.submit(form)
    await waitFor(() => expect(updateExpense).toHaveBeenCalledWith(expense.id, { fecha: expense.fecha, concepto: 'Concepto corregido', monto: 60 }))
    await waitFor(() => expect(getCashSummary).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    expect(deleteExpense).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Eliminar egreso' })).getByRole('button', { name: 'Confirmar eliminación' }))
    await waitFor(() => expect(deleteExpense).toHaveBeenCalledExactlyOnceWith(expense.id))
    await waitFor(() => expect(getCashSummary).toHaveBeenCalledTimes(3))
    expect(getExpenses).toHaveBeenCalledTimes(3)
  })
})
