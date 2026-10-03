import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { createActivity, deleteActivity, getActivities, getActivityTotal, lookupPatientByCode, updateActivity } from './activityService'

const originalBaseURL = apiClient.defaults.baseURL
const activity = { id: 'activity-id', paciente_id: 'patient-id', fecha: '2026-10-05', actividad: 'Consulta', precio: '25.00', paciente: { codigo_paciente: '001', nombres: 'Nombre recibido' } }
afterEach(() => { apiClient.defaults.baseURL = originalBaseURL; vi.restoreAllMocks() })

describe('activityService', () => {
  it('loads backend records with real filters and a separate period total', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: [activity] } }).mockResolvedValueOnce({ data: { periodo: 'mes', total: '25.00' } })
    expect(await getActivities({ mes: 10, anio: 2026, codigo_paciente: '001' })).toHaveLength(1)
    expect(await getActivityTotal({ periodo: 'mes', mes: 10, anio: 2026 })).toEqual({ periodo: 'mes', total: '25.00' })
    expect(get).toHaveBeenNthCalledWith(1, '/actividades', { params: { mes: 10, anio: 2026, codigo_paciente: '001' } })
    expect(get).toHaveBeenNthCalledWith(2, '/actividades/resumen', { params: { periodo: 'mes', mes: 10, anio: 2026 } })
  })

  it('looks up a patient and uses POST, PUT and DELETE without assuming a shared data envelope', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { codigo_paciente: '001', nombres: 'Nombre recibido' } } })
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { message: 'Registrada.' } })
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { message: 'Actualizada.' } })
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { message: 'Eliminada.' } })
    const values = { codigo_paciente: '001', fecha: '2026-10-05', actividad: 'Consulta', precio: 25 }
    expect(await lookupPatientByCode('001')).toEqual({ codigo_paciente: '001', nombres: 'Nombre recibido' })
    await createActivity(values)
    await updateActivity('activity-id', values)
    await deleteActivity('activity-id')
    expect(get).toHaveBeenCalledWith('/actividades/paciente/codigo/001')
    expect(post).toHaveBeenCalledWith('/actividades', values)
    expect(put).toHaveBeenCalledWith('/actividades/activity-id', values)
    expect(remove).toHaveBeenCalledWith('/actividades/activity-id')
  })
})
