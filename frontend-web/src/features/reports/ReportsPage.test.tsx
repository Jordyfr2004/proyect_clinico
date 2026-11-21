import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReportsPage } from './ReportsPage'
import { getClinicalReport, getEconomicReport, getFinancialReport, getIncomeReport } from './reportService'

vi.mock('./reportService', () => ({ getClinicalReport: vi.fn(), getEconomicReport: vi.fn(), getFinancialReport: vi.fn(), getIncomeReport: vi.fn() }))
const balance = { ingresos: '125.00', egresos: '25.00', saldo: '100.00' }
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getClinicalReport).mockResolvedValue({ total_pacientes: 3, historiales_clinicos: 2, citas: { pendientes: 1, programadas: 2, completadas: 3, canceladas: 4 }, total_actividades: 2, actividades_frecuentes: [] })
  vi.mocked(getEconomicReport).mockResolvedValue(balance)
  vi.mocked(getFinancialReport).mockImplementation(async (anio) => ({ anio, meses: Array.from({ length: 12 }, (_, index) => ({ mes: index + 1, ...balance })) }))
  vi.mocked(getIncomeReport).mockResolvedValue({ total_ingresos: '125.00', por_actividad: [] })
})
afterEach(() => vi.unstubAllGlobals())

describe('ReportsPage', () => {
  it('defers the expensive annual query until its panel approaches the viewport', async () => {
    let reveal!: () => void
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { reveal = () => callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver) }
      observe() {}
      disconnect() {}
    })
    render(<ReportsPage/>)
    await waitFor(() => expect(getClinicalReport).toHaveBeenCalledTimes(1))
    expect(getEconomicReport).toHaveBeenCalledTimes(1)
    expect(getIncomeReport).toHaveBeenCalledTimes(1)
    expect(getFinancialReport).not.toHaveBeenCalled()
    act(() => reveal())
    await waitFor(() => expect(getFinancialReport).toHaveBeenCalledTimes(1))
  })

  it('shows only validated backend metrics and all twelve returned months', async () => {
    render(<ReportsPage/>)
    const clinical = screen.getByRole('region', { name: 'Reporte clínico' })
    expect(await within(clinical).findByText('No hay actividades registradas en este reporte.')).toBeInTheDocument()
    expect(clinical).toHaveTextContent('Pacientes3')
    const financial = screen.getByRole('region', { name: 'Reporte financiero anual' })
    expect(await within(financial).findAllByRole('row')).toHaveLength(13)
    expect(screen.getByRole('region', { name: 'Reporte económico' })).toHaveTextContent('$100.00')
  })

  it('requests the selected year from the confirmed financial endpoint', async () => {
    render(<ReportsPage/>)
    await waitFor(() => expect(getFinancialReport).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2024' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    await waitFor(() => expect(getFinancialReport).toHaveBeenLastCalledWith(2024, expect.any(AbortSignal)))
  })

  it('shows a retryable error instead of zeroes when a report fails', async () => {
    vi.mocked(getEconomicReport).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(balance)
    render(<ReportsPage/>)
    const economic = screen.getByRole('region', { name: 'Reporte económico' })
    expect(await within(economic).findByRole('alert')).toHaveTextContent('No fue posible cargar este reporte')
    expect(economic).not.toHaveTextContent('$0.00')
    fireEvent.click(within(economic).getByRole('button', { name: 'Reintentar' }))
    expect(await within(economic).findByText('$100.00')).toBeInTheDocument()
  })
})
