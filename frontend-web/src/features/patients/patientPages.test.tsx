import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PatientsPage } from './PatientsPage'
import { PatientSection, PatientWorkspace } from './PatientWorkspace'
import { createPatient, getPatient, getPatients } from './patientService'

vi.mock('./patientService', () => ({ getPatients: vi.fn(), getPatient: vi.fn(), createPatient: vi.fn() }))

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
    expect(screen.queryByRole('searchbox', { name: 'Buscar pacientes' })).not.toBeInTheDocument()
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

  it('closes the patient dialog with Escape and restores focus to its trigger', async () => {
    vi.mocked(getPatients).mockResolvedValue([])
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    const trigger = screen.getByRole('button', { name: 'Registrar paciente' })
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Registrar paciente' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Registrar paciente' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
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
    expect(screen.queryByRole('searchbox', { name: 'Buscar pacientes' })).not.toBeInTheDocument()
  })

  it.each([
    ['nombre sin distinguir mayúsculas', 'mArÍa', 'patient-name'],
    ['cédula', '0912345678', 'patient-name'],
    ['código', 'COD-002', 'patient-code'],
  ])('filters the received patients by %s without requesting again', async (_kind, query, expectedId) => {
    vi.mocked(getPatients).mockResolvedValue([
      { ...patient, id: 'patient-name', codigo_paciente: 'COD-001', nombres: 'María López' },
      { ...patient, id: 'patient-code', codigo_paciente: 'COD-002', nombres: 'Ana Ruiz', cedula: '0987654321' },
    ])
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    expect(await screen.findByRole('link', { name: /María López/ })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar pacientes' }), { target: { value: query } })
    expect(screen.getAllByRole('link', { name: /Cédula:/ })).toHaveLength(1)
    expect(screen.getByRole('link', { name: /Cédula:/ })).toHaveAttribute('href', `/pacientes/${expectedId}/resumen`)
    expect(getPatients).toHaveBeenCalledTimes(1)
  })

  it('distinguishes a search with no matches from a genuinely empty GET response', async () => {
    vi.mocked(getPatients).mockResolvedValue([patient])
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    expect(await screen.findByRole('link', { name: /Nombre recibido/ })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar pacientes' }), { target: { value: 'sin coincidencia' } })
    expect(screen.getByText('Ningún paciente coincide con la búsqueda.')).toBeInTheDocument()
    expect(screen.queryByText('No hay pacientes registrados.')).not.toBeInTheDocument()
    expect(getPatients).toHaveBeenCalledTimes(1)
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
    expect(screen.getAllByText('No registrado').length).toBeGreaterThan(0)
  })

  it('shows only the six real summary fields and formats the received birth date', async () => {
    vi.mocked(getPatient).mockResolvedValue({ ...patient, telefono: '0991234567', direccion: 'Dirección recibida' })
    renderDetail()
    const summary = await screen.findByRole('heading', { name: 'Datos del paciente' })
    const facts = summary.parentElement?.querySelector('dl')
    expect(facts?.querySelectorAll('dt')).toHaveLength(6)
    expect(facts).toHaveTextContent('001')
    expect(facts).toHaveTextContent('Nombre recibido')
    expect(facts).toHaveTextContent('0912345678')
    expect(facts).toHaveTextContent('0991234567')
    expect(facts).toHaveTextContent('Dirección recibida')
    expect(facts).toHaveTextContent('1 de enero de 1990')
  })

  it('represents nullable summary fields without inventing values', async () => {
    vi.mocked(getPatient).mockResolvedValue({ ...patient, fecha_nacimiento: null })
    renderDetail()
    const summary = await screen.findByRole('heading', { name: 'Datos del paciente' })
    const facts = summary.parentElement?.querySelector('dl')
    expect(facts?.querySelectorAll('dt')).toHaveLength(6)
    expect(facts).toHaveTextContent('TeléfonoNo registrado')
    expect(facts).toHaveTextContent('DirecciónNo registrada')
    expect(facts).toHaveTextContent('Fecha de nacimientoNo registrada')
  })

  it('distinguishes a missing patient from a retryable detail error', async () => {
    vi.mocked(getPatient).mockRejectedValueOnce(httpError(404, 'No encontrado'))
    renderDetail()
    expect(await screen.findByRole('heading', { name: 'Paciente no encontrado' })).toBeInTheDocument()
  })

})
