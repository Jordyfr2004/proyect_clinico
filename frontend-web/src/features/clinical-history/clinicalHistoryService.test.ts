import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { createClinicalHistory, getClinicalHistoryByPatient, updateClinicalHistory } from './clinicalHistoryService'

const originalBaseURL = apiClient.defaults.baseURL
const history = { id: 'history-id', paciente_id: 'patient-id', sexo: null, lugar_nacimiento: 'Lugar recibido', antecedentes_enfermedades: null, cirugias: null, medicacion_actual: null }

afterEach(() => {
  apiClient.defaults.baseURL = originalBaseURL
  vi.restoreAllMocks()
})

describe('clinicalHistoryService', () => {
  it('loads the confirmed patient-specific path and ignores extra timestamps', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { ...history, created_at: '2026-10-01' } } })
    expect(await getClinicalHistoryByPatient('patient-id')).toEqual(history)
    expect(get).toHaveBeenCalledExactlyOnceWith('/historiales-clinicos/paciente/patient-id')
  })

  it('rejects a malformed history instead of displaying incomplete clinical data', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { ...history, medicacion_actual: undefined } } })
    await expect(getClinicalHistoryByPatient('patient-id')).rejects.toThrow()
  })

  it('POSTs the confirmed patient and five nullable fields', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { message: 'Registrado.', data: history } })
    const values = { paciente_id: 'patient-id', sexo: null, lugar_nacimiento: 'Lugar recibido', antecedentes_enfermedades: null, cirugias: null, medicacion_actual: null }
    expect(await createClinicalHistory(values)).toEqual(history)
    expect(post).toHaveBeenCalledExactlyOnceWith('/historiales-clinicos', values)
  })

  it('PUTs the confirmed fields without paciente_id', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { message: 'Actualizado.', data: history } })
    const values = { sexo: null, lugar_nacimiento: 'Lugar recibido', antecedentes_enfermedades: null, cirugias: null, medicacion_actual: null }
    expect(await updateClinicalHistory('history-id', values)).toEqual(history)
    expect(put).toHaveBeenCalledExactlyOnceWith('/historiales-clinicos/history-id', values)
  })

  it('does not request data without a configured API base', async () => {
    apiClient.defaults.baseURL = undefined
    const get = vi.spyOn(apiClient, 'get')
    await expect(getClinicalHistoryByPatient('patient-id')).rejects.toThrow('VITE_API_BASE_URL')
    expect(get).not.toHaveBeenCalled()
  })
})
