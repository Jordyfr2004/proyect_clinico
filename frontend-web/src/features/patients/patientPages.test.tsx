import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MyProfilePage } from './MyProfilePage'
import { PatientsPage } from './PatientsPage'
import { PatientSection, PatientWorkspace } from './PatientWorkspace'
import { createPatient, getMyProfile, getPatient, getPatients } from './patientService'

vi.mock('./patientService', () => ({ getPatients: vi.fn(), getPatient: vi.fn(), getMyProfile: vi.fn(), createPatient: vi.fn() }))

const patient = { id: 'patient-id', codigo_paciente: '001', nombres: 'Nombre recibido', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: '1990-01-01' }
const httpError = (status: number, message: string) => ({ isAxiosError: true, response: { status, data: { message } } })

beforeEach(() => vi.resetAllMocks())

function renderDetail(path = '/pacientes/patient-id/resumen') {
  render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<PatientWorkspace/>} path="/pacientes/:patientId"><Route element={<PatientSection title="Resumen"/>} path="resumen"/><Route element={<PatientSection title="Historial clínico"/>} path="historial"/></Route></Routes></MemoryRouter>)
}

describe('patient views', () => {
  it('shows loading and then only records received by GET /pacientes', async () => {
    let resolve!: (value: typeof patient[]) => void
    vi.mocked(getPatients).mockReturnValue(new Promise((done) => { resolve = done }))
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando información')
    resolve([patient])
    expect(await screen.findByRole('link', { name: /Nombre recibido/ })).toHaveAttribute('href', '/pacientes/patient-id/resumen')
    expect(screen.getByText('Cédula: 0912345678')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar paciente' })).toBeEnabled()
  })

  it('opens an empty accessible creation form and validates required fields and future dates', async () => {
    vi.mocked(getPatients).mockResolvedValue([])
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    const trigger = screen.getByRole('button', { name: 'Registrar paciente' })
    fireEvent.click(trigger)
    const form = screen.getByRole('form', { name: 'Datos del nuevo paciente' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    for (const label of ['Nombres', 'Cédula', 'Teléfono', 'Dirección', 'Fecha de nacimiento']) {
      expect(within(form).getByLabelText(new RegExp(label))).toHaveValue('')
    }
    expect(within(form).getByLabelText(/Nombres/)).toHaveFocus()
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar paciente' }))
    expect(await within(form).findByText('Los nombres son obligatorios.')).toBeInTheDocument()
    expect(within(form).getByText('La cédula es obligatoria.')).toBeInTheDocument()
    fireEvent.change(within(form).getByLabelText(/Nombres/), { target: { value: 'Nombre recibido' } })
    fireEvent.change(within(form).getByLabelText(/Cédula/), { target: { value: '0912345678' } })
    fireEvent.change(within(form).getByLabelText(/Fecha de nacimiento/), { target: { value: '2999-01-01' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar paciente' }))
    expect(await within(form).findByText('La fecha de nacimiento no puede ser futura.')).toBeInTheDocument()
    expect(createPatient).not.toHaveBeenCalled()
    fireEvent.click(within(form).getByRole('button', { name: 'Cancelar' }))
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('form', { name: 'Datos del nuevo paciente' })).not.toBeInTheDocument()
  })

  it('sends exact fields with empty optionals as null, then refreshes GET after 201', async () => {
    vi.mocked(getPatients).mockResolvedValueOnce([]).mockResolvedValueOnce([patient])
    vi.mocked(createPatient).mockResolvedValue({ message: 'Paciente registrado correctamente.', patient })
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar paciente' }))
    const form = screen.getByRole('form', { name: 'Datos del nuevo paciente' })
    fireEvent.change(within(form).getByLabelText(/Nombres/), { target: { value: 'Nombre recibido' } })
    fireEvent.change(within(form).getByLabelText(/Cédula/), { target: { value: '0912345678' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar paciente' }))
    await waitFor(() => expect(createPatient).toHaveBeenCalledWith({ nombres: 'Nombre recibido', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: null }))
    expect(await screen.findByRole('status')).toHaveTextContent('Paciente registrado correctamente.')
    expect(await screen.findByRole('link', { name: /Nombre recibido/ })).toBeInTheDocument()
    expect(getPatients).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('form', { name: 'Datos del nuevo paciente' })).not.toBeInTheDocument()
  })

  it('preserves supplied optional values in the exact POST payload', async () => {
    vi.mocked(getPatients).mockResolvedValue([])
    vi.mocked(createPatient).mockResolvedValue({ message: 'Paciente registrado correctamente.', patient })
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar paciente' }))
    const form = screen.getByRole('form', { name: 'Datos del nuevo paciente' })
    fireEvent.change(within(form).getByLabelText(/Nombres/), { target: { value: 'Nombre recibido' } })
    fireEvent.change(within(form).getByLabelText(/Cédula/), { target: { value: '0912345678' } })
    fireEvent.change(within(form).getByLabelText(/Teléfono/), { target: { value: '0991234567' } })
    fireEvent.change(within(form).getByLabelText(/Dirección/), { target: { value: 'Dirección recibida' } })
    fireEvent.change(within(form).getByLabelText(/Fecha de nacimiento/), { target: { value: '1990-01-01' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar paciente' }))
    await waitFor(() => expect(createPatient).toHaveBeenCalledWith({ nombres: 'Nombre recibido', cedula: '0912345678', telefono: '0991234567', direccion: 'Dirección recibida', fecha_nacimiento: '1990-01-01' }))
  })

  it.each([
    ['422', httpError(422, 'Ya existe un paciente registrado con esta cédula.'), 'Ya existe un paciente registrado con esta cédula.'],
    ['network', { isAxiosError: true }, 'No fue posible comunicarse con el servidor.'],
    ['500', httpError(500, 'Server Error'), 'El servidor respondió con HTTP 500.'],
  ])('shows the %s POST failure without creating a fake record', async (_kind, failure, message) => {
    vi.mocked(getPatients).mockResolvedValue([])
    vi.mocked(createPatient).mockRejectedValue(failure)
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar paciente' }))
    const form = screen.getByRole('form', { name: 'Datos del nuevo paciente' })
    fireEvent.change(within(form).getByLabelText(/Nombres/), { target: { value: 'Nombre recibido' } })
    fireEvent.change(within(form).getByLabelText(/Cédula/), { target: { value: '0912345678' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar paciente' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByRole('link', { name: /Nombre recibido/ })).not.toBeInTheDocument()
    expect(getPatients).toHaveBeenCalledTimes(1)
  })

  it('disables submit while pending and sends only one POST on repeated submit', async () => {
    vi.mocked(getPatients).mockResolvedValue([])
    let resolve!: (value: { message: string; patient: typeof patient }) => void
    vi.mocked(createPatient).mockReturnValue(new Promise((done) => { resolve = done }))
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar paciente' }))
    const form = screen.getByRole('form', { name: 'Datos del nuevo paciente' })
    fireEvent.change(within(form).getByLabelText(/Nombres/), { target: { value: 'Nombre recibido' } })
    fireEvent.change(within(form).getByLabelText(/Cédula/), { target: { value: '0912345678' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar paciente' }))
    expect(await within(form).findByRole('button', { name: 'Registrando…' })).toBeDisabled()
    fireEvent.submit(form)
    expect(createPatient).toHaveBeenCalledTimes(1)
    resolve({ message: 'Paciente registrado correctamente.', patient })
    expect(await screen.findByRole('status')).toHaveTextContent('Paciente registrado correctamente.')
  })

  it('shows a genuine empty list and a retryable list error', async () => {
    vi.mocked(getPatients).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce([])
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la información.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('No hay pacientes registrados.')).toBeInTheDocument()
  })

  it('loads a real patient detail and leaves clinical tabs pending', async () => {
    vi.mocked(getPatient).mockResolvedValue(patient)
    renderDetail('/pacientes/patient-id/historial')
    expect(screen.getByRole('status')).toHaveTextContent('Cargando información')
    expect(await screen.findByRole('heading', { name: 'Nombre recibido' })).toBeInTheDocument()
    expect(getPatient).toHaveBeenCalledWith('patient-id')
    expect(screen.getByRole('status')).toHaveTextContent('Integración pendiente')
  })

  it('shows confirmed basic fields on the patient summary', async () => {
    vi.mocked(getPatient).mockResolvedValue(patient)
    renderDetail()
    expect(await screen.findByRole('heading', { name: 'Datos del paciente' })).toBeInTheDocument()
    expect(screen.getByText('001')).toBeInTheDocument()
    expect(screen.getByText('No registrado')).toBeInTheDocument()
  })

  it('distinguishes a missing patient from a retryable detail error', async () => {
    vi.mocked(getPatient).mockRejectedValueOnce(httpError(404, 'No encontrado'))
    renderDetail()
    expect(await screen.findByRole('heading', { name: 'Paciente no encontrado' })).toBeInTheDocument()
  })

  it('shows the real patient profile returned by GET /paciente/mi-perfil', async () => {
    vi.mocked(getMyProfile).mockResolvedValue(patient)
    render(<MyProfilePage/>)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando información')
    expect(await screen.findByText('Nombre recibido')).toBeInTheDocument()
    expect(getMyProfile).toHaveBeenCalledOnce()
  })

  it('shows the backend 404 message when the account is not linked', async () => {
    vi.mocked(getMyProfile).mockRejectedValue(httpError(404, 'La cuenta no está vinculada a un paciente.'))
    render(<MyProfilePage/>)
    expect(await screen.findByRole('alert')).toHaveTextContent('La cuenta no está vinculada a un paciente.')
  })

  it('shows a retryable network error for the patient profile', async () => {
    vi.mocked(getMyProfile).mockRejectedValueOnce({ isAxiosError: true }).mockResolvedValueOnce(patient)
    render(<MyProfilePage/>)
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la información.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Nombre recibido')).toBeInTheDocument()
  })
})
