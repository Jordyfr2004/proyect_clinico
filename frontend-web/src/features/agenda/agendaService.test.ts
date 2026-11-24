import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { cancelAppointment, completeAppointment, createMedicalAppointment, createPersonalEntry, deleteAgendaEntry, getAgendaMonth, getAppointmentSummary, getPendingRequests, searchAgendaPatients, programRequest, registerClinicalData, updateAgendaEntry } from './agendaService'

const originalBaseURL = apiClient.defaults.baseURL
const entry = { id: 'entry-id', paciente_id: null, fecha: '2026-10-05', hora_inicio: '10:00:00', hora_fin: '11:00:00', tipo: 'personal', descripcion: 'Bloque', estado: null, diagnostico: null, tratamiento: null, observacion: null, paciente: null }
afterEach(() => { vi.unstubAllEnvs(); apiClient.defaults.baseURL = originalBaseURL; vi.restoreAllMocks() })

describe('agendaService', () => {
  it('requests and validates the proposed orchestrated summary contract', async () => {
    vi.stubEnv('VITE_ENABLE_ACADEMIC_ORCHESTRATION', 'true')
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const summary = { cita: { id: 'cita/1', fecha: '2026-10-05', hora_inicio: '10:00', hora_fin: '11:00', estado: 'programada', descripcion: 'Control' }, paciente: { codigo_paciente: '001', nombres: 'Paciente recibido' } }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: summary } })
    const controller = new AbortController()
    expect(await getAppointmentSummary('cita/1', controller.signal)).toEqual(summary)
    expect(get).toHaveBeenCalledWith('/resumen-cita/cita%2F1', { signal: controller.signal })
  })

  it('rejects a summary without real patient data and accepts an explicit empty result', async () => {
    vi.stubEnv('VITE_ENABLE_ACADEMIC_ORCHESTRATION', 'true')
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: { cita: { id: '1' }, paciente: null } } }).mockResolvedValueOnce({ data: { data: null } })
    await expect(getAppointmentSummary('1')).rejects.toThrow()
    await expect(getAppointmentSummary('1')).resolves.toBeNull()
  })

  it('rejects a summary for another appointment or with an invalid date', async () => {
    vi.stubEnv('VITE_ENABLE_ACADEMIC_ORCHESTRATION', 'true')
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const valid = { cita: { id: 'other', fecha: '2026-10-05', hora_inicio: '10:00', hora_fin: '11:00', estado: 'programada', descripcion: null }, paciente: { codigo_paciente: '001', nombres: 'Paciente recibido' } }
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: valid } }).mockResolvedValueOnce({ data: { data: { ...valid, cita: { ...valid.cita, id: '1', fecha: 'not-a-date' } } } })
    await expect(getAppointmentSummary('1')).rejects.toThrow()
    await expect(getAppointmentSummary('1')).rejects.toThrow()
  })
  it('never requests the unofficial academic endpoint by default', async () => {
    vi.stubEnv('VITE_ENABLE_ACADEMIC_ORCHESTRATION', '')
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: null } })
    await expect(getAppointmentSummary('1')).rejects.toThrow(/académic/)
    expect(get).not.toHaveBeenCalled()
  })

  it('preserves reservation names and nullable patient relationships', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const reservation = { ...entry, tipo: 'cita_medica', nombre_reserva: 'Ana Reserva', estado: 'programada' }
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: [reservation] } })
    expect(await getAgendaMonth(10, 2026)).toEqual([reservation])
  })

  it('uses the dedicated nonpaginated agenda search with both patient kinds', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const results = [{ id: 'p1', codigo_paciente: '001', nombres: 'Ana', cedula: null, registrado: true }, { id: null, codigo_paciente: null, cedula: null, nombre_reserva: 'Ana Reserva', registrado: false }]
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: results } })
    expect(await searchAgendaPatients({ buscar: 'Ana' })).toEqual({ data: results })
    expect(get).toHaveBeenCalledExactlyOnceWith('/pacientes', { params: { agenda: 1, buscar: 'Ana' } })
  })

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
    await completeAppointment('entry-id', { actividad: 'Limpieza dental', precio: 35.5 })
    await deleteAgendaEntry('entry-id')
    expect(put).toHaveBeenNthCalledWith(1, '/agenda/entry-id', { descripcion: 'Cambio' })
    expect(put).toHaveBeenNthCalledWith(2, '/agenda/entry-id/cancelar')
    expect(put).toHaveBeenNthCalledWith(3, '/agenda/entry-id/completar', { actividad: 'Limpieza dental', precio: 35.5 })
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
