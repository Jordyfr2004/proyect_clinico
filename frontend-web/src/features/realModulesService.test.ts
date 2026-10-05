import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../services/apiClient'
import { activatePatientAccount, deactivatePatientAccount, getPatientAccounts, unlinkPatientAccount } from './assistant/patientAccountsService'
import { createExpense, deleteExpense, getCashSummary, getExpenses, updateExpense } from './cash/cashService'
import { getRecordedActions, getRecordedSessions, hideRecordedAction } from './audit/auditService'
import { getPatientEvidence } from './evidence/evidenceService'

const originalBase = apiClient.defaults.baseURL
afterEach(() => { vi.restoreAllMocks(); apiClient.defaults.baseURL = originalBase })

describe('confirmed backend paths', () => {
  it('filters patient accounts from GET /usuarios and calls the three confirmed mutations', async () => {
    apiClient.defaults.baseURL = 'http://api.test/api'
    const account = { id: 'account-1', name: 'Cuenta recibida', email: null, username: '0912345678', role: 'paciente', paciente_id: 'patient-1', activo: true, created_at: null }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: [account, { ...account, id: 'assistant-1', role: 'asistente' }] } })
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { message: 'Confirmado', data: account } })
    expect(await getPatientAccounts()).toEqual([account])
    expect(get).toHaveBeenCalledWith('/usuarios')
    await activatePatientAccount(account.id)
    await deactivatePatientAccount(account.id)
    await unlinkPatientAccount(account.id)
    expect(put.mock.calls.map(([path]) => path)).toEqual(['/usuarios/account-1/activar', '/usuarios/account-1/desactivar', '/usuarios/account-1/desvincular-paciente'])
  })

  it('uses backend Caja totals and exact egreso endpoints', async () => {
    apiClient.defaults.baseURL = 'http://api.test/api'
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { periodo: 'dia', ingresos: '10.00', egresos: '3.00', saldo: '7.00' } }).mockResolvedValueOnce({ data: { data: [] } })
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { message: 'Confirmado' } })
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { message: 'Confirmado' } })
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { message: 'Confirmado' } })
    expect((await getCashSummary({ periodo: 'dia', fecha: '2026-10-04' })).saldo).toBe('7.00')
    await getExpenses({ fecha: '2026-10-04' })
    expect(get.mock.calls).toEqual([['/reportes/caja', { params: { periodo: 'dia', fecha: '2026-10-04' } }], ['/egresos', { params: { fecha: '2026-10-04' } }]])
    const payload = { fecha: '2026-10-04', concepto: 'Confirmado', monto: 3 }
    await createExpense(payload); await updateExpense('expense-1', payload); await deleteExpense('expense-1')
    expect(post).toHaveBeenCalledWith('/egresos', payload)
    expect(put).toHaveBeenCalledWith('/egresos/expense-1', payload)
    expect(remove).toHaveBeenCalledWith('/egresos/expense-1')
  })

  it('uses audit and evidence read paths without a file URL', async () => {
    apiClient.defaults.baseURL = 'http://api.test/api'
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { acciones: [] } }).mockResolvedValueOnce({ data: { sesiones: [] } }).mockResolvedValueOnce({ data: { paciente: { id: 'patient-1', codigo_paciente: '001', nombres: 'Recibido' }, data: [] } })
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { message: 'Ocultada' } })
    await getRecordedActions('2026-10-04'); await getRecordedSessions(); await getPatientEvidence('patient-1'); await hideRecordedAction('action-1')
    expect(get.mock.calls).toEqual([['/configuracion/acciones', { params: { fecha: '2026-10-04' } }], ['/configuracion/sesiones', { params: {} }], ['/evidencias-clinicas/paciente/patient-1']])
    expect(remove).toHaveBeenCalledWith('/configuracion/acciones/action-1')
  })
})
