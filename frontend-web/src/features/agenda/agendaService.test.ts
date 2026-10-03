import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { cancelAppointment, completeAppointment, createMedicalAppointment, createPersonalEntry, deleteAgendaEntry, getAgendaMonth, getPendingRequests, programRequest, registerClinicalData, updateAgendaEntry } from './agendaService'

const originalBaseURL = apiClient.defaults.baseURL
const entry = { id: 'entry-id', paciente_id: null, fecha: '2026-10-05', hora_inicio: '10:00:00', hora_fin: '11:00:00', tipo: 'personal', descripcion: 'Bloque', estado: null, diagnostico: null, tratamiento: null, observacion: null, paciente: null }
afterEach(() => { apiClient.defaults.baseURL = originalBaseURL; vi.restoreAllMocks() })

describe('agendaService', () => {
  it('loads a month and undated pending requests separately', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: [entry] } }).mockResolvedValueOnce({ data: { data: [{ ...entry, tipo: 'cita_medica', estado: 'pendiente', fecha: null, hora_inicio: null, hora_fin: null }] } })
    expect(await getAgendaMonth(10, 2026)).toEqual([entry])
    expect(await getPendingRequests()).toHaveLength(1)
    expect(get).toHaveBeenNthCalledWith(1, '/agenda', { params: { mes: 10, anio: 2026 } })
    expect(get).toHaveBeenNthCalledWith(2, '/agenda', { params: { estado: 'pendiente' } })
  })

  it('uses confirmed creation and scheduling contracts', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { message: 'Registrado.' } })
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { message: 'Programada.' } })
    const slot = { fecha: '2026-10-05', hora_inicio: '10:00', hora_fin: '11:00' }
    await createPersonalEntry({ ...slot, descripcion: 'Bloque' })
    await createMedicalAppointment({ ...slot, codigo_paciente: '001', descripcion: null })
    await programRequest('request-id', slot)
    expect(post).toHaveBeenNthCalledWith(1, '/agenda/personal', { ...slot, descripcion: 'Bloque' })
    expect(post).toHaveBeenNthCalledWith(2, '/agenda/cita-medica', { ...slot, codigo_paciente: '001', descripcion: null })
    expect(put).toHaveBeenCalledWith('/agenda/solicitud/request-id/programar', slot)
  })

  it('uses confirmed edit, cancel, complete and delete methods', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { message: 'Actualizado.' } })
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { message: 'Eliminado.' } })
    await updateAgendaEntry('entry-id', { descripcion: 'Cambio' })
    await cancelAppointment('entry-id')
    await completeAppointment('entry-id')
    await deleteAgendaEntry('entry-id')
    expect(put).toHaveBeenNthCalledWith(1, '/agenda/entry-id', { descripcion: 'Cambio' })
    expect(put).toHaveBeenNthCalledWith(2, '/agenda/entry-id/cancelar')
    expect(put).toHaveBeenNthCalledWith(3, '/agenda/entry-id/completar')
    expect(remove).toHaveBeenCalledExactlyOnceWith('/agenda/entry-id')
  })

  it('parses clinical fields from GET and sends only the confirmed clinical payload', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const clinicalEntry = { ...entry, tipo: 'cita_medica', estado: 'programada', diagnostico: 'Diagnóstico recibido', tratamiento: 'Tratamiento recibido', observacion: 'Observación recibida' }
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: [clinicalEntry] } })
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { message: 'Datos clínicos registrados correctamente.', data: clinicalEntry } })
    expect(await getAgendaMonth(10, 2026)).toEqual([clinicalEntry])
    expect(await registerClinicalData('entry-id', { diagnostico: 'Diagnóstico', tratamiento: 'Tratamiento', observacion: null })).toBe('Datos clínicos registrados correctamente.')
    expect(put).toHaveBeenCalledExactlyOnceWith('/agenda/entry-id/datos-clinicos', { diagnostico: 'Diagnóstico', tratamiento: 'Tratamiento', observacion: null })
  })

  it('rejects an invalid clinical update response', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { message: 'Datos clínicos registrados correctamente.' } })
    await expect(registerClinicalData('entry-id', { diagnostico: 'Diagnóstico', tratamiento: 'Tratamiento', observacion: null })).rejects.toThrow()
  })
})
