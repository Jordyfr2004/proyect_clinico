import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { ZodError } from 'zod'
import { AuthContext } from '../auth/authContext'
import type { AuthUser, UserRole } from '../auth/authService'
import { ClinicalHistorySection } from './ClinicalHistorySection'
import { createClinicalHistory, getClinicalHistoryByPatient, updateClinicalHistory } from './clinicalHistoryService'

vi.mock('./clinicalHistoryService', () => ({
  getClinicalHistoryByPatient: vi.fn(),
  createClinicalHistory: vi.fn(),
  updateClinicalHistory: vi.fn(),
}))

const patient = { id: 'patient-id', codigo_paciente: '001', nombres: 'Nombre recibido', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: null }
const history = { id: 'history-id', paciente_id: 'patient-id', sexo: 'Texto recibido', lugar_nacimiento: null, antecedentes_enfermedades: 'Antecedente recibido', cirugias: null, medicacion_actual: null }
const httpError = (status: number, message: string) => ({ isAxiosError: true, response: { status, data: { message } } })

function renderHistory(role: UserRole = 'doctora') {
  const user: AuthUser = { id: 'user-id', name: 'Personal', username: 'usuario', role, paciente_id: null, activo: true }
  render(
    <AuthContext.Provider value={{ status: 'authenticated', user, sessionError: null, login: async () => {}, logout: async () => {} }}>
      <MemoryRouter initialEntries={['/pacientes/patient-id/historial']}>
        <Routes>
          <Route element={<Outlet context={patient}/>} path="/pacientes/:patientId">
            <Route element={<ClinicalHistorySection/>} path="historial"/>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

beforeEach(() => { vi.resetAllMocks() })

describe('ClinicalHistorySection', () => {
  it('shows loading, then only validated backend data with neutral null values', async () => {
    let resolve!: (value: typeof history) => void
    vi.mocked(getClinicalHistoryByPatient).mockReturnValue(new Promise((done) => { resolve = done }))
    renderHistory()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando información')
    resolve(history)
    expect(await screen.findByText('Antecedente recibido')).toBeInTheDocument()
    expect(screen.getByText('Texto recibido')).toBeInTheDocument()
    expect(screen.getAllByText('No registrado')).toHaveLength(3)
    expect(getClinicalHistoryByPatient).toHaveBeenCalledExactlyOnceWith('patient-id')
  })

  it('treats GET 404 as an empty history and gives the doctor an empty form without editable patient id', async () => {
    vi.mocked(getClinicalHistoryByPatient).mockRejectedValue(httpError(404, 'El paciente no tiene historial clínico registrado.'))
    renderHistory()
    const form = await screen.findByRole('form', { name: 'Registrar historial clínico' })
    expect(screen.getByText('El paciente no tiene historial clínico registrado.')).toBeInTheDocument()
    for (const label of ['Sexo', 'Lugar de nacimiento', 'Antecedentes de enfermedades', 'Cirugías', 'Medicación actual']) {
      expect(within(form).getByLabelText(label)).toHaveValue('')
    }
    expect(within(form).queryByLabelText('paciente_id')).not.toBeInTheDocument()
    expect(within(form).queryByLabelText('Paciente')).not.toBeInTheDocument()
  })

  it('lets an assistant read existing data without create or edit actions', async () => {
    vi.mocked(getClinicalHistoryByPatient).mockResolvedValue(history)
    renderHistory('asistente')
    expect(await screen.findByText('Antecedente recibido')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar historial' })).not.toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('shows only the empty state to an assistant when GET returns 404', async () => {
    vi.mocked(getClinicalHistoryByPatient).mockRejectedValue(httpError(404, 'No registrado.'))
    renderHistory('asistente')
    expect(await screen.findByText('El paciente no tiene historial clínico registrado.')).toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('shows a retryable network error and rejects an invalid response', async () => {
    vi.mocked(getClinicalHistoryByPatient).mockRejectedValueOnce({ isAxiosError: true }).mockRejectedValueOnce(new ZodError([])).mockResolvedValueOnce(history)
    renderHistory()
    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible comunicarse con el servidor.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible verificar el historial clínico.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Antecedente recibido')).toBeInTheDocument()
  })

  it('POSTs the patient id from context and converts all empty optional fields to null', async () => {
    vi.mocked(getClinicalHistoryByPatient).mockRejectedValue(httpError(404, 'No registrado.'))
    vi.mocked(createClinicalHistory).mockResolvedValue({ ...history, sexo: null, antecedentes_enfermedades: null })
    renderHistory()
    const form = await screen.findByRole('form', { name: 'Registrar historial clínico' })
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar historial' }))
    await waitFor(() => expect(createClinicalHistory).toHaveBeenCalledExactlyOnceWith({
      paciente_id: 'patient-id', sexo: null, lugar_nacimiento: null, antecedentes_enfermedades: null, cirugias: null, medicacion_actual: null,
    }))
    expect(await screen.findByRole('status')).toHaveTextContent('Historial clínico registrado.')
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('preserves supplied optional fields in the exact POST body', async () => {
    vi.mocked(getClinicalHistoryByPatient).mockRejectedValue(httpError(404, 'No registrado.'))
    vi.mocked(createClinicalHistory).mockResolvedValue(history)
    renderHistory()
    const form = await screen.findByRole('form', { name: 'Registrar historial clínico' })
    fireEvent.change(within(form).getByLabelText('Sexo'), { target: { value: 'Texto recibido' } })
    fireEvent.change(within(form).getByLabelText('Antecedentes de enfermedades'), { target: { value: 'Antecedente recibido' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar historial' }))
    await waitFor(() => expect(createClinicalHistory).toHaveBeenCalledWith({
      paciente_id: 'patient-id', sexo: 'Texto recibido', lugar_nacimiento: null, antecedentes_enfermedades: 'Antecedente recibido', cirugias: null, medicacion_actual: null,
    }))
  })

  it('blocks duplicate POST while saving', async () => {
    vi.mocked(getClinicalHistoryByPatient).mockRejectedValue(httpError(404, 'No registrado.'))
    vi.mocked(createClinicalHistory).mockReturnValue(new Promise(() => {}))
    renderHistory()
    const form = await screen.findByRole('form', { name: 'Registrar historial clínico' })
    fireEvent.submit(form)
    expect(await within(form).findByRole('button', { name: 'Guardando…' })).toBeDisabled()
    fireEvent.submit(form)
    await waitFor(() => expect(createClinicalHistory).toHaveBeenCalledTimes(1))
  })

  it('shows a POST 422 message, keeps the form, and rechecks whether a history now exists', async () => {
    vi.mocked(getClinicalHistoryByPatient).mockRejectedValue(httpError(404, 'No registrado.'))
    vi.mocked(createClinicalHistory).mockRejectedValue(httpError(422, 'Los datos no son válidos.'))
    renderHistory()
    const form = await screen.findByRole('form', { name: 'Registrar historial clínico' })
    fireEvent.change(within(form).getByLabelText('Sexo'), { target: { value: 'Texto ingresado' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar historial' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('Los datos no son válidos.')
    expect(within(form).getByLabelText('Sexo')).toHaveValue('Texto ingresado')
    expect(getClinicalHistoryByPatient).toHaveBeenCalledTimes(2)
  })

  it('synchronizes a competing history after POST 422 and stops offering creation', async () => {
    vi.mocked(getClinicalHistoryByPatient).mockRejectedValueOnce(httpError(404, 'No registrado.')).mockResolvedValueOnce(history)
    vi.mocked(createClinicalHistory).mockRejectedValue(httpError(422, 'Ya existe un historial clínico para este paciente.'))
    renderHistory()
    fireEvent.click(within(await screen.findByRole('form', { name: 'Registrar historial clínico' })).getByRole('button', { name: 'Guardar historial' }))
    expect(await screen.findByText('Antecedente recibido')).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Registrar historial clínico' })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Ya existe un historial clínico')
  })

  it('populates the edit form with real values and cancels without PUT', async () => {
    vi.mocked(getClinicalHistoryByPatient).mockResolvedValue(history)
    renderHistory()
    const trigger = await screen.findByRole('button', { name: 'Editar historial' })
    fireEvent.click(trigger)
    const form = screen.getByRole('form', { name: 'Editar historial clínico' })
    expect(within(form).getByLabelText('Sexo')).toHaveValue('Texto recibido')
    expect(within(form).getByLabelText('Antecedentes de enfermedades')).toHaveValue('Antecedente recibido')
    fireEvent.change(within(form).getByLabelText('Sexo'), { target: { value: 'Sin guardar' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText('Texto recibido')).toBeInTheDocument()
    expect(updateClinicalHistory).not.toHaveBeenCalled()
  })

  it('PUTs only editable fields and shows the validated updated response', async () => {
    vi.mocked(getClinicalHistoryByPatient).mockResolvedValue(history)
    vi.mocked(updateClinicalHistory).mockResolvedValue({ ...history, sexo: 'Actualizado' })
    renderHistory()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar historial' }))
    const form = screen.getByRole('form', { name: 'Editar historial clínico' })
    fireEvent.change(within(form).getByLabelText('Sexo'), { target: { value: 'Actualizado' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(updateClinicalHistory).toHaveBeenCalledExactlyOnceWith('history-id', {
      sexo: 'Actualizado', lugar_nacimiento: null, antecedentes_enfermedades: 'Antecedente recibido', cirugias: null, medicacion_actual: null,
    }))
    expect(await screen.findByText('Actualizado')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Historial clínico actualizado.')
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('keeps editing values on PUT 422 without showing internal exception text', async () => {
    vi.mocked(getClinicalHistoryByPatient).mockResolvedValue(history)
    vi.mocked(updateClinicalHistory).mockRejectedValue(httpError(422, 'SQLSTATE internal-secret-token'))
    renderHistory()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar historial' }))
    const form = screen.getByRole('form', { name: 'Editar historial clínico' })
    fireEvent.change(within(form).getByLabelText('Sexo'), { target: { value: 'Texto ingresado' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar cambios' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('Revisa los datos del historial clínico.')
    expect(within(form).getByLabelText('Sexo')).toHaveValue('Texto ingresado')
    expect(screen.queryByText('SQLSTATE internal-secret-token')).not.toBeInTheDocument()
  })

  it('blocks duplicate PUT while saving', async () => {
    vi.mocked(getClinicalHistoryByPatient).mockResolvedValue(history)
    vi.mocked(updateClinicalHistory).mockReturnValue(new Promise(() => {}))
    renderHistory()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar historial' }))
    const form = screen.getByRole('form', { name: 'Editar historial clínico' })
    fireEvent.submit(form)
    expect(await within(form).findByRole('button', { name: 'Guardando…' })).toBeDisabled()
    fireEvent.submit(form)
    await waitFor(() => expect(updateClinicalHistory).toHaveBeenCalledTimes(1))
  })

  it('reconsults after an invalid POST response rather than inventing a record', async () => {
    vi.mocked(getClinicalHistoryByPatient).mockRejectedValueOnce(httpError(404, 'No registrado.')).mockResolvedValueOnce(history)
    vi.mocked(createClinicalHistory).mockRejectedValue(new ZodError([]))
    renderHistory()
    fireEvent.click(within(await screen.findByRole('form', { name: 'Registrar historial clínico' })).getByRole('button', { name: 'Guardar historial' }))
    expect(await screen.findByText('Antecedente recibido')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('La respuesta del servidor no permite verificar los cambios.')
    expect(getClinicalHistoryByPatient).toHaveBeenCalledTimes(2)
  })
})
