import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { createPatient, getMyProfile, getPatient, getPatients } from './patientService'

const originalBaseURL = apiClient.defaults.baseURL
const patient = { id: 'patient-id', codigo_paciente: '001', nombres: 'Nombre recibido', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: '1990-01-01T00:00:00.000000Z' }

afterEach(() => {
  apiClient.defaults.baseURL = originalBaseURL
  vi.restoreAllMocks()
})

describe('patientService', () => {
  it('loads the real patient list and detail using confirmed paths', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: [{ ...patient, created_at: 'ignored' }] } }).mockResolvedValueOnce({ data: { data: patient } })
    expect(await getPatients()).toEqual([patient])
    expect(await getPatient('patient-id')).toEqual(patient)
    expect(get).toHaveBeenNthCalledWith(1, '/pacientes')
    expect(get).toHaveBeenNthCalledWith(2, '/pacientes/patient-id')
  })

  it('accepts an empty list and rejects malformed patient records', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: [] } }).mockResolvedValueOnce({ data: { data: [{ ...patient, nombres: undefined }] } })
    expect(await getPatients()).toEqual([])
    await expect(getPatients()).rejects.toThrow()
  })

  it('loads the confirmed patient profile and validates its fields', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: patient } })
    expect(await getMyProfile()).toEqual({ codigo_paciente: '001', nombres: 'Nombre recibido', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: '1990-01-01T00:00:00.000000Z' })
    expect(get).toHaveBeenCalledWith('/paciente/mi-perfil')
  })

  it('rejects an invalid profile and does not request without an API base', async () => {
    apiClient.defaults.baseURL = 'https://api.clinica.test/api'
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { ...patient, cedula: undefined } } })
    await expect(getMyProfile()).rejects.toThrow()
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
})
