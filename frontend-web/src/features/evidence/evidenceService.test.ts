import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { createPatientEvidence, deletePatientEvidence, getPatientEvidence, updatePatientEvidence } from './evidenceService'

const originalBase = apiClient.defaults.baseURL
const evidence = { id: 'evidence-1', paciente_id: 'patient-1', tipo: 'rx', nombre_archivo: 'radiografia.png', ruta_archivo: 'private/ftp/path', mime_type: 'image/png', tamano: 4, descripcion: null, fecha: '2026-11-04' }

beforeEach(() => { apiClient.defaults.baseURL = 'http://api.test/api' })
afterEach(() => { vi.restoreAllMocks(); apiClient.defaults.baseURL = originalBase })

describe('evidenceService', () => {
  it('reads validated metadata without exposing the internal file path', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { paciente: { id: 'patient-1', codigo_paciente: '001', nombres: 'Paciente' }, data: [evidence] } })
    const records = await getPatientEvidence('patient-1', new AbortController().signal)
    expect(get).toHaveBeenCalledWith('/evidencias-clinicas/paciente/patient-1', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(records[0]).not.toHaveProperty('ruta_archivo')
  })

  it('uploads only the five permitted fields as authenticated FormData', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { message: 'Evidencia registrada.', data: evidence } })
    const archivo = new File(['dato'], 'radiografia.png', { type: 'image/png' })
    expect(await createPatientEvidence({ paciente_id: 'patient-1', tipo: 'rx', archivo, descripcion: null, fecha: '2026-11-04' })).toBe('Evidencia registrada.')
    expect(post).toHaveBeenCalledWith('/evidencias-clinicas', expect.any(FormData))
    const body = post.mock.calls[0][1] as FormData
    expect([...body.keys()]).toEqual(['paciente_id', 'tipo', 'archivo', 'fecha'])
    expect(body.get('archivo')).toBe(archivo)
  })

  it('updates metadata without a file and deletes through the confirmed routes', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { message: 'Evidencia actualizada.', data: evidence } })
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { message: 'Evidencia eliminada.' } })
    const values = { tipo: 'caso_clinico' as const, descripcion: 'Control', fecha: '2026-11-05' }
    expect(await updatePatientEvidence('evidence-1', values)).toBe('Evidencia actualizada.')
    expect(put).toHaveBeenCalledWith('/evidencias-clinicas/evidence-1', values)
    expect(await deletePatientEvidence('evidence-1')).toBe('Evidencia eliminada.')
    expect(remove).toHaveBeenCalledWith('/evidencias-clinicas/evidence-1')
  })
})
