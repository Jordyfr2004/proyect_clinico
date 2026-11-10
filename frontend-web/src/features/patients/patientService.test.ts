import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { createPatient, getPatient, getPatients, updatePatient } from './patientService'

const originalBaseURL = apiClient.defaults.baseURL
const patient = { id: 'patient-id', codigo_paciente: '001', nombres: 'Nombre recibido', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: '1990-01-01T00:00:00.000000Z' }
const pageOf = (data: unknown[]) => ({ data, current_page: 1, last_page: 1, per_page: 20, total: data.length, next_page_url: null, prev_page_url: null })

afterEach(() => {
  apiClient.defaults.baseURL = originalBaseURL
  vi.restoreAllMocks()
})

describe('patientService', () => {
  it('loads the real patient list and detail using confirmed paths', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: pageOf([{ ...patient, created_at: 'ignored' }]) }).mockResolvedValueOnce({ data: { data: patient } })
    expect(await getPatients()).toEqual(pageOf([patient]))
    expect(await getPatient('patient-id')).toEqual(patient)
    expect(get).toHaveBeenNthCalledWith(1, '/pacientes', { params: {} })
    expect(get).toHaveBeenNthCalledWith(2, '/pacientes/patient-id')
  })

  it('accepts an empty list and rejects malformed patient records', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: pageOf([]) }).mockResolvedValueOnce({ data: pageOf([{ ...patient, nombres: undefined }]) })
    expect(await getPatients()).toEqual(pageOf([]))
    await expect(getPatients()).rejects.toThrow()
  })

  it('passes backend search and page parameters without filtering a partial page locally', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const response = { ...pageOf([patient]), current_page: 2, last_page: 3, total: 42, prev_page_url: '/pacientes?page=1', next_page_url: '/pacientes?page=3' }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: response })
    expect(await getPatients({ buscar: 'Nombre', page: 2 })).toEqual(response)
    expect(get).toHaveBeenCalledExactlyOnceWith('/pacientes', { params: { buscar: 'Nombre', page: 2 } })
  })

  it('rejects an invalid patient and does not request without an API base', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { ...patient, cedula: undefined } } })
    await expect(getPatient('patient-id')).rejects.toThrow()
    apiClient.defaults.baseURL = undefined
    await expect(getPatients()).rejects.toThrow('VITE_API_BASE_URL')
  })

  it('posts only the confirmed patient fields and validates the 201 response', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { message: 'Paciente registrado correctamente.', data: { ...patient, created_at: 'ignored' } } })
    const values = { nombres: 'Nombre recibido', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: null }

    expect(await createPatient(values)).toEqual({ message: 'Paciente registrado correctamente.', patient })
    expect(post).toHaveBeenCalledWith('/pacientes', values)
  })

  it('rejects an invalid POST response and does not request without an API base', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { message: 'Paciente registrado correctamente.', data: { ...patient, nombres: undefined } } })
    await expect(createPatient({ nombres: 'Nombre', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: null })).rejects.toThrow()
    apiClient.defaults.baseURL = undefined
    await expect(createPatient({ nombres: 'Nombre', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: null })).rejects.toThrow('VITE_API_BASE_URL')
  })

  it('updates only patient fields with PUT and validates the response', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { message: 'Paciente actualizado correctamente.', data: patient } })
    const values = { nombres: 'Nombre recibido', telefono: null }
    expect(await updatePatient('patient-id', values)).toEqual({ message: 'Paciente actualizado correctamente.', patient })
    expect(put).toHaveBeenCalledExactlyOnceWith('/pacientes/patient-id', values)
  })

  it('propagates 404 and 422 and rejects an invalid update response', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const put = vi.spyOn(apiClient, 'put')
    put.mockRejectedValueOnce({ response: { status: 404 } }).mockRejectedValueOnce({ response: { status: 422 } })
      .mockResolvedValueOnce({ data: { message: 'Paciente actualizado correctamente.', data: { ...patient, nombres: null } } })
    await expect(updatePatient('patient-id', { nombres: 'Nombre' })).rejects.toMatchObject({ response: { status: 404 } })
    await expect(updatePatient('patient-id', { nombres: 'Nombre' })).rejects.toMatchObject({ response: { status: 422 } })
    await expect(updatePatient('patient-id', { nombres: 'Nombre' })).rejects.toThrow()
  })
})
