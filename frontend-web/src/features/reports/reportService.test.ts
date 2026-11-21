import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { getClinicalReport, getDashboardReport, getEconomicReport, getFinancialReport, getIncomeReport } from './reportService'

const originalBase = apiClient.defaults.baseURL
afterEach(() => { apiClient.defaults.baseURL = originalBase; vi.restoreAllMocks() })

describe('reportService', () => {
  it('reads all confirmed report paths and validates real response shapes', async () => {
    apiClient.defaults.baseURL = 'https://api.test/api'
    const balance = { ingresos: '125.00', egresos: '25.00', saldo: '100.00' }
    const clinical = { total_pacientes: 3, historiales_clinicos: 2, citas: { pendientes: 1, programadas: 2, completadas: 3, canceladas: 4 }, total_actividades: 2, actividades_frecuentes: [{ actividad: 'Actividad recibida', cantidad: 2 }] }
    const financial = { anio: 2026, meses: Array.from({ length: 12 }, (_, index) => ({ mes: index + 1, ...balance })) }
    const income = { total_ingresos: '125.00', por_actividad: [{ actividad: 'Actividad recibida', cantidad: 2, total: '125.00' }] }
    const dashboard = { pacientes: { total: 3 }, citas: { hoy: 2, solicitudes_pendientes: 1 }, mes_actual: balance }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: clinical }).mockResolvedValueOnce({ data: balance }).mockResolvedValueOnce({ data: financial }).mockResolvedValueOnce({ data: income }).mockResolvedValueOnce({ data: dashboard })
    expect(await getClinicalReport()).toEqual(clinical)
    expect(await getEconomicReport()).toEqual(balance)
    expect(await getFinancialReport(2026)).toEqual(financial)
    expect(await getIncomeReport()).toEqual(income)
    expect(await getDashboardReport()).toEqual(dashboard)
    expect(get.mock.calls.map(([path, options]) => [path, options])).toEqual([
      ['/reportes/clinicos', { params: undefined }], ['/reportes/economicos', { params: undefined }],
      ['/reportes/financieros', { params: { anio: 2026 } }], ['/reportes/ingresos', { params: undefined }], ['/reportes/dashboard', { params: undefined }],
    ])
  })

  it('rejects invalid report metrics rather than showing invented zeroes', async () => {
    apiClient.defaults.baseURL = 'https://api.test/api'
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { pacientes: { total: 0 }, citas: { hoy: 0, solicitudes_pendientes: 0 }, mes_actual: { ingresos: 'invalid', egresos: '0.00', saldo: '0.00' } } })
    await expect(getDashboardReport()).rejects.toThrow()
  })
})
