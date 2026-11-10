import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PatientsPage } from './PatientsPage'
import { PatientWorkspace } from './PatientWorkspace'
import { PatientDiagnosisSection } from './PatientDiagnosisSection'
import { ClinicalHistorySection } from '../clinical-history/ClinicalHistorySection'
import { createPatient, getPatient, getPatients, updatePatient } from './patientService'
import { AuthContext } from '../auth/authContext'
import type { UserRole } from '../auth/authService'

vi.mock('./patientService', () => ({ getPatients: vi.fn(), getPatient: vi.fn(), createPatient: vi.fn(), updatePatient: vi.fn() }))
vi.mock('../clinical-history/clinicalHistoryService', () => ({ getClinicalHistoryByPatient: vi.fn(() => Promise.reject({ isAxiosError: true, response: { status: 404 } })) }))

const patient = { id: 'patient-id', codigo_paciente: '001', nombres: 'Nombre recibido', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: '1990-01-01' }
const pageOf = (data: typeof patient[], current_page = 1, last_page = 1) => ({ data, current_page, last_page, per_page: 20, total: data.length, next_page_url: current_page < last_page ? '/pacientes?page=2' : null, prev_page_url: current_page > 1 ? '/pacientes?page=1' : null })
const httpError = (status: number, message: string) => ({ isAxiosError: true, response: { status, data: { message } } })

beforeEach(() => vi.resetAllMocks())

function LocationDisplay() {
  const location = useLocation()
  return <span data-testid="location">{location.pathname}{location.search}</span>
}

function renderDetail(path = '/pacientes/patient-id/historial', role: UserRole = 'doctora') {
  render(<AuthContext.Provider value={{ status: 'authenticated', user: { id: 'user-id', name: 'Personal', username: 'personal', role, paciente_id: null, activo: true }, sessionError: null, login: async () => {}, logout: async () => {} }}><MemoryRouter initialEntries={[path]}><LocationDisplay/><Routes><Route element={<PatientWorkspace/>} path="/pacientes/:patientId"><Route element={<Navigate replace to="historial"/>} index/><Route element={<Navigate replace to="../historial"/>} path="resumen"/><Route element={<ClinicalHistorySection/>} path="historial"/><Route element={<PatientDiagnosisSection/>} path="diagnosticos"/><Route element={<Navigate replace to="../diagnosticos?apartado=tratamientos"/>} path="tratamientos"/><Route element={<Navigate replace to="../diagnosticos?apartado=odontograma"/>} path="odontograma"/></Route></Routes></MemoryRouter></AuthContext.Provider>)
}

describe('patient views', () => {
  it('restores the search and its fresh server result without another GET on return', async () => {
    vi.mocked(getPatients).mockImplementation(async (params) => pageOf(params?.buscar ? [patient] : []))
    const first = render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    await screen.findByText('No hay pacientes registrados.')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar pacientes' }), { target: { value: 'Nombre' } })
    expect(await screen.findByRole('link', { name: /Nombre recibido/ })).toBeInTheDocument()
    expect(getPatients).toHaveBeenCalledTimes(2)
    first.unmount()

    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    expect(screen.getByRole('searchbox', { name: 'Buscar pacientes' })).toHaveValue('Nombre')
    expect(await screen.findByRole('link', { name: /Nombre recibido/ })).toBeInTheDocument()
    expect(getPatients).toHaveBeenCalledTimes(2)
  })

  it('shows loading and then only records received by GET /pacientes', async () => {
    let resolve!: (value: ReturnType<typeof pageOf>) => void
    vi.mocked(getPatients).mockReturnValue(new Promise((done) => { resolve = done }))
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando información')
    expect(screen.getByRole('searchbox', { name: 'Buscar pacientes' })).toBeInTheDocument()
    resolve(pageOf([patient]))
    expect(await screen.findByRole('link', { name: /Nombre recibido/ })).toHaveAttribute('href', '/pacientes/patient-id/historial')
    expect(screen.getByText('Cédula: 0912345678')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar paciente' })).toBeEnabled()
  })

  it('opens an empty accessible creation form and validates required fields and future dates', async () => {
    vi.mocked(getPatients).mockResolvedValue(pageOf([]))
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
    vi.mocked(getPatients).mockResolvedValue(pageOf([]))
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    const trigger = screen.getByRole('button', { name: 'Registrar paciente' })
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Registrar paciente' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Registrar paciente' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('sends exact fields with empty optionals as null, then refreshes GET after 201', async () => {
    vi.mocked(getPatients).mockResolvedValueOnce(pageOf([])).mockResolvedValueOnce(pageOf([patient]))
    vi.mocked(createPatient).mockResolvedValue({ message: 'Paciente registrado correctamente.', patient })
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    await screen.findByText('No hay pacientes registrados.')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar paciente' }))
    const form = screen.getByRole('form', { name: 'Datos del nuevo paciente' })
    fireEvent.change(within(form).getByLabelText(/Nombres/), { target: { value: 'Nombre recibido' } })
    fireEvent.change(within(form).getByLabelText(/Cédula/), { target: { value: '0912345678' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar paciente' }))
    await waitFor(() => expect(createPatient).toHaveBeenCalledWith({ nombres: 'Nombre recibido', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: null }))
    expect(await screen.findByText('Paciente registrado correctamente.')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Nombre recibido/ })).toBeInTheDocument()
    expect(getPatients).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('form', { name: 'Datos del nuevo paciente' })).not.toBeInTheDocument()
  })

  it('refreshes the unfiltered page after creation without refetching the superseded search', async () => {
    vi.mocked(getPatients).mockImplementation(async (params) => pageOf(params?.buscar ? [] : [patient]))
    vi.mocked(createPatient).mockResolvedValue({ message: 'Paciente registrado correctamente.', patient })
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    await screen.findByRole('link', { name: /Nombre recibido/ })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar pacientes' }), { target: { value: 'Sin coincidencias' } })
    await screen.findByText('Ningún paciente coincide con la búsqueda.')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar paciente' }))
    const form = screen.getByRole('form', { name: 'Datos del nuevo paciente' })
    fireEvent.change(within(form).getByLabelText(/Nombres/), { target: { value: 'Nombre recibido' } })
    fireEvent.change(within(form).getByLabelText(/Cédula/), { target: { value: '0912345678' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar paciente' }))
    await waitFor(() => expect(createPatient).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(getPatients).toHaveBeenCalledTimes(3))
    expect(vi.mocked(getPatients).mock.calls.map(([params]) => params?.buscar ?? '')).toEqual(['', 'Sin coincidencias', ''])
  })

  it('preserves supplied optional values in the exact POST payload', async () => {
    vi.mocked(getPatients).mockResolvedValue(pageOf([]))
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
    vi.mocked(getPatients).mockResolvedValue(pageOf([]))
    vi.mocked(createPatient).mockRejectedValue(failure)
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    await screen.findByText('No hay pacientes registrados.')
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
    vi.mocked(getPatients).mockResolvedValue(pageOf([]))
    let resolve!: (value: { message: string; patient: typeof patient }) => void
    vi.mocked(createPatient).mockReturnValue(new Promise((done) => { resolve = done }))
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    await screen.findByText('No hay pacientes registrados.')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar paciente' }))
    const form = screen.getByRole('form', { name: 'Datos del nuevo paciente' })
    fireEvent.change(within(form).getByLabelText(/Nombres/), { target: { value: 'Nombre recibido' } })
    fireEvent.change(within(form).getByLabelText(/Cédula/), { target: { value: '0912345678' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar paciente' }))
    expect(await within(form).findByRole('button', { name: 'Registrando…' })).toBeDisabled()
    fireEvent.submit(form)
    expect(createPatient).toHaveBeenCalledTimes(1)
    resolve({ message: 'Paciente registrado correctamente.', patient })
    expect(await screen.findByText('Paciente registrado correctamente.')).toBeInTheDocument()
  })

  it('shows a genuine empty list and a retryable list error', async () => {
    vi.mocked(getPatients).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(pageOf([]))
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la información.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('No hay pacientes registrados.')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Buscar pacientes' })).toBeInTheDocument()
  })

  it.each([
    ['nombre sin distinguir mayúsculas', 'mArÍa', 'patient-name'],
    ['cédula', '0912345678', 'patient-name'],
    ['código', 'COD-002', 'patient-code'],
  ])('searches the backend by %s and renders its page', async (_kind, query, expectedId) => {
    const first = { ...patient, id: 'patient-name', codigo_paciente: 'COD-001', nombres: 'María López' }
    const second = { ...patient, id: 'patient-code', codigo_paciente: 'COD-002', nombres: 'Ana Ruiz', cedula: '0987654321' }
    vi.mocked(getPatients).mockResolvedValueOnce(pageOf([first, second])).mockResolvedValueOnce(pageOf([expectedId === 'patient-name' ? first : second]))
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    expect(await screen.findByRole('link', { name: /María López/ })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar pacientes' }), { target: { value: query } })
    await waitFor(() => expect(getPatients).toHaveBeenCalledWith({ buscar: query, page: 1 }, expect.any(AbortSignal)))
    expect(await screen.findByRole('link', { name: /Cédula:/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Cédula:/ })).toHaveAttribute('href', `/pacientes/${expectedId}/historial`)
    expect(getPatients).toHaveBeenCalledTimes(2)
  })

  it('distinguishes a search with no matches from a genuinely empty GET response', async () => {
    vi.mocked(getPatients).mockResolvedValueOnce(pageOf([patient])).mockResolvedValueOnce(pageOf([]))
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    expect(await screen.findByRole('link', { name: /Nombre recibido/ })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar pacientes' }), { target: { value: 'sin coincidencia' } })
    expect(await screen.findByText('Ningún paciente coincide con la búsqueda.')).toBeInTheDocument()
    expect(screen.queryByText('No hay pacientes registrados.')).not.toBeInTheDocument()
    expect(getPatients).toHaveBeenCalledTimes(2)
  })

  it('navigates only through pages returned by Laravel', async () => {
    vi.mocked(getPatients).mockResolvedValueOnce(pageOf([patient], 1, 2)).mockResolvedValueOnce(pageOf([{ ...patient, id: 'second-id' }], 2, 2))
    render(<MemoryRouter><PatientsPage/></MemoryRouter>)
    expect(await screen.findByText('Página 1 de 2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument()
    expect(getPatients).toHaveBeenLastCalledWith({ page: 2 }, expect.any(AbortSignal))
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  it('loads a real patient detail with exactly four main sections', async () => {
    vi.mocked(getPatient).mockResolvedValue(patient)
    renderDetail('/pacientes/patient-id/historial')
    expect(screen.getByRole('status')).toHaveTextContent('Cargando información')
    expect(await screen.findByRole('heading', { name: 'Nombre recibido' })).toBeInTheDocument()
    expect(getPatient).toHaveBeenCalledWith('patient-id')
    const tabs = screen.getByRole('navigation', { name: 'Secciones del expediente' })
    expect(within(tabs).getAllByRole('link')).toHaveLength(4)
    expect(within(tabs).getByRole('link', { name: 'Historial clínico' })).toBeInTheDocument()
    expect(within(tabs).getByRole('link', { name: 'Diagnósticos' })).toBeInTheDocument()
    expect(within(tabs).getByRole('link', { name: 'Evidencias clínicas' })).toBeInTheDocument()
    expect(within(tabs).getByRole('link', { name: 'Recetas' })).toBeInTheDocument()
    expect(within(tabs).queryByText(/Planes|Tratamientos|Odontograma|Resumen/)).not.toBeInTheDocument()
  })

  it('keeps Tratamientos and Odontograma inside Diagnósticos, including legacy links', async () => {
    vi.mocked(getPatient).mockResolvedValue(patient)
    renderDetail('/pacientes/patient-id/tratamientos')
    expect(await screen.findByRole('heading', { name: 'Evaluación clínica' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tratamientos' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(screen.getByRole('group', { name: 'Apartados de evaluación clínica' })).getAllByRole('button').map((button) => button.textContent)).toEqual(['Odontograma', 'Diagnóstico', 'Tratamientos'])
    fireEvent.click(screen.getByRole('button', { name: 'Odontograma' }))
    expect(screen.getByRole('button', { name: 'Odontograma' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('location')).toHaveTextContent('/pacientes/patient-id/diagnosticos')
    expect(screen.getByRole('status')).toHaveTextContent('estructura clínica')
    expect(within(screen.getByRole('navigation', { name: 'Secciones del expediente' })).getAllByRole('link')).toHaveLength(4)
  })

  it('opens Odontograma first when Diagnósticos has no explicit apartado', async () => {
    vi.mocked(getPatient).mockResolvedValue(patient)
    renderDetail('/pacientes/patient-id/diagnosticos')
    expect(await screen.findByRole('heading', { name: 'Evaluación clínica' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Odontograma' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('location')).toHaveTextContent('/pacientes/patient-id/diagnosticos')
    fireEvent.click(screen.getByRole('button', { name: 'Diagnóstico' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/pacientes/patient-id/diagnosticos?apartado=diagnostico')
  })

  it('redirects the old Resumen route into Historial clínico', async () => {
    vi.mocked(getPatient).mockResolvedValue(patient)
    renderDetail('/pacientes/patient-id/resumen')
    expect(await screen.findByRole('heading', { name: 'Datos generales del paciente' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Historial clínico' })).toHaveAttribute('aria-current', 'page')
  })

  it.each([
    ['doctora', 'diagnosticos', true],
    ['asistente', 'diagnosticos', false],
  ] as const)('keeps %s %s pending and only offers the authorized Citas médicas route', async (role, path, canOpenAppointments) => {
    vi.mocked(getPatient).mockResolvedValue(patient)
    renderDetail(`/pacientes/patient-id/${path}`, role)
    expect(await screen.findByRole('heading', { name: 'Evaluación clínica' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Apartados de evaluación clínica' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Integración pendiente')
    fireEvent.click(screen.getByRole('button', { name: 'Diagnóstico' }))
    const action = screen.queryByRole('link', { name: 'Ir a Citas médicas' })
    if (canOpenAppointments) expect(action).toHaveAttribute('href', '/citas-medicas')
    else expect(action).not.toBeInTheDocument()
  })

  it('shows confirmed basic fields within clinical history', async () => {
    vi.mocked(getPatient).mockResolvedValue(patient)
    renderDetail()
    expect(await screen.findByRole('heading', { name: 'Datos generales del paciente' })).toBeInTheDocument()
    expect(screen.getByText('001')).toBeInTheDocument()
    expect(screen.getAllByText('No registrado').length).toBeGreaterThan(0)
  })

  it('shows only the six real general fields and formats the received birth date', async () => {
    vi.mocked(getPatient).mockResolvedValue({ ...patient, telefono: '0991234567', direccion: 'Dirección recibida' })
    renderDetail()
    const summary = await screen.findByRole('heading', { name: 'Datos generales del paciente' })
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
    const summary = await screen.findByRole('heading', { name: 'Datos generales del paciente' })
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

  it.each(['doctora', 'asistente'] as const)('edits patient fields as %s and refetches the backend record', async (role) => {
    const refreshed = { ...patient, nombres: 'Nombre actualizado' }
    vi.mocked(getPatient).mockResolvedValueOnce(patient).mockResolvedValueOnce(refreshed)
    vi.mocked(updatePatient).mockResolvedValue({ message: 'Paciente actualizado correctamente.', patient: refreshed })
    renderDetail(undefined, role)
    fireEvent.click(await screen.findByRole('button', { name: 'Editar datos' }))
    const form = screen.getByRole('form', { name: 'Editar datos del paciente' })
    expect(within(form).queryByRole('textbox', { name: /Código/ })).not.toBeInTheDocument()
    fireEvent.change(within(form).getByLabelText('Nombres'), { target: { value: 'Nombre actualizado' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(updatePatient).toHaveBeenCalledWith('patient-id', { nombres: 'Nombre actualizado' }))
    expect(await screen.findByRole('heading', { name: 'Nombre actualizado' })).toBeInTheDocument()
    expect(getPatient).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows 422 without replacing the patient with unsaved values', async () => {
    vi.mocked(getPatient).mockResolvedValue(patient)
    vi.mocked(updatePatient).mockRejectedValue(httpError(422, 'Cédula duplicada.'))
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar datos' }))
    fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'Cambio no guardado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Cédula duplicada.')
    expect(screen.getByRole('heading', { name: 'Nombre recibido' })).toBeInTheDocument()
  })

})
