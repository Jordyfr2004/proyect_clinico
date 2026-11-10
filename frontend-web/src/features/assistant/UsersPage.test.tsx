import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UsersPage } from './UsersPage'
import { activateAssistant, changeAssistantPassword, createAssistant, deactivateAssistant, deleteAssistant, getAssistants, type Assistant } from './assistantService'
import { getPatientAccounts } from './patientAccountsService'

vi.mock('./assistantService', () => ({ getAssistants: vi.fn(), createAssistant: vi.fn(), activateAssistant: vi.fn(), deactivateAssistant: vi.fn(), changeAssistantPassword: vi.fn(), deleteAssistant: vi.fn() }))
vi.mock('./patientAccountsService', () => ({ getPatientAccounts: vi.fn() }))

const assistant = { id: 'assistant-id', name: 'Nombre recibido', email: 'recibido@backend.test', username: 'recibido', role: 'asistente' as const, activo: true }
const other = { ...assistant, id: 'other-id', name: 'Otro asistente', username: 'otro', email: null }
const httpError = (status: number, message: string) => ({ isAxiosError: true, response: { status, data: { message } } })

beforeEach(() => { vi.resetAllMocks(); vi.mocked(getAssistants).mockResolvedValue([]); vi.mocked(getPatientAccounts).mockResolvedValue([]) })

async function openCreate() {
  fireEvent.click(screen.getByRole('button', { name: 'Crear asistente' }))
  return screen.findByRole('form', { name: 'Datos para crear cuenta de asistente' })
}

function fillCreate(form: HTMLElement) {
  fireEvent.change(within(form).getByLabelText('Nombre'), { target: { value: assistant.name } })
  fireEvent.change(within(form).getByLabelText('Correo electrónico'), { target: { value: assistant.email } })
  fireEvent.change(within(form).getByLabelText('Usuario'), { target: { value: assistant.username } })
  fireEvent.change(within(form).getByLabelText('Contraseña'), { target: { value: 'clave-confirmada' } })
}

async function openPassword() {
  fireEvent.click(await screen.findByRole('button', { name: 'Cambiar contraseña' }))
  return screen.findByRole('form', { name: 'Cambiar contraseña de asistente' })
}

function fillPassword(form: HTMLElement) {
  fireEvent.change(within(form).getByLabelText('Nueva contraseña'), { target: { value: 'clave-confirmada' } })
  fireEvent.change(within(form).getByLabelText('Confirmar contraseña'), { target: { value: 'clave-confirmada' } })
}

describe('UsersPage', () => {
  it('reuses the assistant list on a fresh return without another GET', async () => {
    vi.mocked(getAssistants).mockResolvedValue([assistant])
    const first = render(<UsersPage/>)
    expect(await screen.findByText(assistant.name)).toBeInTheDocument()
    first.unmount()
    render(<UsersPage/>)
    expect(screen.getByText(assistant.name)).toBeInTheDocument()
    expect(getAssistants).toHaveBeenCalledTimes(1)
  })

  it('does not request the full patient-account scan until its section is opened', async () => {
    render(<UsersPage/>)
    expect(await screen.findByText('No hay cuentas de asistentes registradas.')).toBeInTheDocument()
    expect(getAssistants).toHaveBeenCalledTimes(1)
    expect(getPatientAccounts).not.toHaveBeenCalled()
    const toggle = screen.getByRole('button', { name: 'Ver cuentas de pacientes' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(await screen.findByRole('heading', { name: 'Cuentas de pacientes' })).toBeInTheDocument()
    await waitFor(() => expect(getPatientAccounts).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'Ocultar cuentas de pacientes' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows loading, then all assistants returned by the backend', async () => {
    let resolve!: (value: Assistant[]) => void
    vi.mocked(getAssistants).mockReturnValue(new Promise((done) => { resolve = done }))
    render(<UsersPage/>)
    expect(screen.getAllByRole('status').some((item) => item.textContent?.includes('Cargando'))).toBe(true)
    resolve([assistant, other])
    expect(await screen.findByText(assistant.name)).toBeInTheDocument()
    expect(screen.getByText(other.name)).toBeInTheDocument()
    expect(screen.getByText('Correo no registrado', { exact: false })).toBeInTheDocument()
  })

  it('shows a genuine empty list and an empty creation form', async () => {
    render(<UsersPage/>)
    expect(await screen.findByText('No hay cuentas de asistentes registradas.')).toBeInTheDocument()
    const form = await openCreate()
    for (const label of ['Nombre', 'Correo electrónico', 'Usuario', 'Contraseña']) expect(within(form).getByLabelText(label)).toHaveValue('')
    expect(within(form).getByLabelText('Nombre')).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear asistente' })).toHaveFocus()
  })

  it('retries a failed assistant list without inventing a record', async () => {
    vi.mocked(getAssistants).mockRejectedValueOnce(new Error('invalid')).mockResolvedValueOnce([assistant])
    render(<UsersPage/>)
    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible cargar las cuentas de asistentes.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText(assistant.name)).toBeInTheDocument()
    expect(getAssistants).toHaveBeenCalledTimes(2)
  })

  it('validates creation, posts the exact fields, and reloads the list', async () => {
    vi.mocked(getAssistants).mockResolvedValueOnce([]).mockResolvedValueOnce([assistant])
    vi.mocked(createAssistant).mockResolvedValue(assistant)
    render(<UsersPage/>)
    const form = await openCreate()
    fireEvent.submit(form)
    expect(await within(form).findByText('El nombre es obligatorio.')).toBeInTheDocument()
    fillCreate(form)
    fireEvent.submit(form)
    await waitFor(() => expect(createAssistant).toHaveBeenCalledExactlyOnceWith({ name: assistant.name, email: assistant.email, username: assistant.username, password: 'clave-confirmada' }))
    expect(await screen.findByText(assistant.name)).toBeInTheDocument()
    expect(getAssistants).toHaveBeenCalledTimes(2)
  })

  it('prevents duplicate creation while the POST is pending', async () => {
    vi.mocked(createAssistant).mockReturnValue(new Promise(() => {}))
    render(<UsersPage/>)
    const form = await openCreate()
    fillCreate(form)
    fireEvent.submit(form)
    expect(await within(form).findByRole('button', { name: 'Creando cuenta…' })).toBeDisabled()
    fireEvent.submit(form)
    expect(createAssistant).toHaveBeenCalledTimes(1)
  })

  it('shows backend 422 and a network error without adding a local account', async () => {
    vi.mocked(createAssistant).mockRejectedValueOnce(httpError(422, 'Datos inválidos.')).mockRejectedValueOnce({ isAxiosError: true })
    render(<UsersPage/>)
    const form = await openCreate()
    fillCreate(form)
    fireEvent.submit(form)
    expect(await within(form).findByRole('alert')).toHaveTextContent('Datos inválidos.')
    fireEvent.submit(form)
    expect(await within(form).findByRole('alert')).toHaveTextContent('No fue posible comunicarse con el servidor.')
    expect(screen.queryByText(assistant.name)).not.toBeInTheDocument()
  })

  it('reconciles a 409 creation with the actual assistant list', async () => {
    vi.mocked(getAssistants).mockResolvedValueOnce([]).mockResolvedValueOnce([assistant])
    vi.mocked(createAssistant).mockRejectedValue(httpError(409, 'Ya existe una cuenta.'))
    render(<UsersPage/>)
    const form = await openCreate()
    fillCreate(form)
    fireEvent.submit(form)
    expect(await screen.findByText(assistant.name)).toBeInTheDocument()
    expect(getAssistants).toHaveBeenCalledTimes(2)
    expect(createAssistant).toHaveBeenCalledTimes(1)
  })

  it('confirms deactivation, reloads the real status and targets only the selected id', async () => {
    vi.mocked(getAssistants).mockResolvedValueOnce([assistant, other]).mockResolvedValueOnce([{ ...assistant, activo: false }, other])
    vi.mocked(deactivateAssistant).mockResolvedValue()
    render(<UsersPage/>)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Desactivar' }))[0])
    expect(deactivateAssistant).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(deactivateAssistant).toHaveBeenCalledExactlyOnceWith(assistant.id))
    expect(await screen.findByRole('button', { name: 'Activar' })).toBeInTheDocument()
  })

  it('reconciles status 409 with a new backend GET', async () => {
    vi.mocked(getAssistants).mockResolvedValueOnce([{ ...assistant, activo: false }]).mockResolvedValueOnce([assistant])
    vi.mocked(activateAssistant).mockRejectedValue(httpError(409, 'La cuenta ya está activa.'))
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Activar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La cuenta ya está activa.')
    expect(await screen.findByRole('button', { name: 'Desactivar' })).toBeInTheDocument()
    expect(activateAssistant).toHaveBeenCalledExactlyOnceWith(assistant.id)
  })

  it('reconciles status 404 with an empty list', async () => {
    vi.mocked(getAssistants).mockResolvedValueOnce([assistant]).mockResolvedValueOnce([])
    vi.mocked(deactivateAssistant).mockRejectedValue(httpError(404, 'Asistente no encontrado.'))
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('No hay cuentas de asistentes registradas.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Asistente no encontrado.')
  })

  it('requires confirmation for DELETE, supports Escape and refetches after success', async () => {
    vi.mocked(getAssistants).mockResolvedValueOnce([assistant]).mockResolvedValueOnce([])
    vi.mocked(deleteAssistant).mockResolvedValue()
    render(<UsersPage/>)
    const trigger = await screen.findByRole('button', { name: 'Eliminar' })
    fireEvent.click(trigger)
    expect(deleteAssistant).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(trigger).toHaveFocus()
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(deleteAssistant).toHaveBeenCalledExactlyOnceWith(assistant.id))
    expect(await screen.findByText('No hay cuentas de asistentes registradas.')).toBeInTheDocument()
  })

  it('keeps a visible assistant on DELETE network failure', async () => {
    vi.mocked(getAssistants).mockResolvedValue([{ ...assistant, password: 'secret' } as typeof assistant])
    vi.mocked(deleteAssistant).mockRejectedValue({ isAxiosError: true })
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible comunicarse')
    expect(screen.getByText(assistant.name)).toBeInTheDocument()
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
    expect(getAssistants).toHaveBeenCalledTimes(1)
  })

  it('blocks other mutations and duplicate DELETE while deletion is pending', async () => {
    vi.mocked(getAssistants).mockResolvedValue([assistant])
    vi.mocked(deleteAssistant).mockReturnValue(new Promise(() => {}))
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }))
    const confirm = screen.getByRole('button', { name: 'Confirmar' })
    fireEvent.click(confirm)
    expect(confirm).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeDisabled()
    fireEvent.click(confirm)
    expect(deleteAssistant).toHaveBeenCalledTimes(1)
    expect(changeAssistantPassword).not.toHaveBeenCalled()
  })

  it('validates password, then sends a single targeted password mutation', async () => {
    vi.mocked(getAssistants).mockResolvedValue([assistant])
    vi.mocked(changeAssistantPassword).mockResolvedValue()
    render(<UsersPage/>)
    const form = await openPassword()
    fireEvent.change(within(form).getByLabelText('Nueva contraseña'), { target: { value: 'short' } })
    fireEvent.submit(form)
    expect(await within(form).findByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
    fillPassword(form)
    fireEvent.submit(form)
    await waitFor(() => expect(changeAssistantPassword).toHaveBeenCalledExactlyOnceWith(assistant.id, { password: 'clave-confirmada', password_confirmation: 'clave-confirmada' }))
    expect(await screen.findByText(/Contraseña de Nombre recibido actualizada/)).toBeInTheDocument()
  })

  it('shows 422 for password change without replacing backend data', async () => {
    vi.mocked(getAssistants).mockResolvedValue([assistant])
    vi.mocked(changeAssistantPassword).mockRejectedValue(httpError(422, 'Contraseña inválida.'))
    render(<UsersPage/>)
    const form = await openPassword()
    fillPassword(form)
    fireEvent.submit(form)
    expect(await within(form).findByRole('alert')).toHaveTextContent('Contraseña inválida.')
    expect(within(form).getByLabelText('Nueva contraseña')).toHaveValue('clave-confirmada')
  })

  it('locks status and deletion while a password mutation is pending', async () => {
    vi.mocked(getAssistants).mockResolvedValue([assistant])
    vi.mocked(changeAssistantPassword).mockReturnValue(new Promise(() => {}))
    render(<UsersPage/>)
    const form = await openPassword()
    fillPassword(form)
    fireEvent.submit(form)
    await waitFor(() => expect(changeAssistantPassword).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'Desactivar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    fireEvent.submit(form)
    expect(changeAssistantPassword).toHaveBeenCalledTimes(1)
    expect(deactivateAssistant).not.toHaveBeenCalled()
    expect(deleteAssistant).not.toHaveBeenCalled()
  })

  it('locks password changes during a pending status mutation', async () => {
    vi.mocked(getAssistants).mockResolvedValue([assistant])
    vi.mocked(deactivateAssistant).mockReturnValue(new Promise(() => {}))
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeDisabled()
    expect(deactivateAssistant).toHaveBeenCalledExactlyOnceWith(assistant.id)
    expect(changeAssistantPassword).not.toHaveBeenCalled()
  })
})
