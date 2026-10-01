import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UsersPage } from './UsersPage'
import { activateAssistant, changeAssistantPassword, createAssistant, deactivateAssistant, getAssistant } from './assistantService'

vi.mock('./assistantService', () => ({
  getAssistant: vi.fn(),
  createAssistant: vi.fn(),
  activateAssistant: vi.fn(),
  deactivateAssistant: vi.fn(),
  changeAssistantPassword: vi.fn(),
}))

const assistant = { id: 'assistant-id', name: 'Nombre recibido', email: 'recibido@backend.test', username: 'recibido', role: 'asistente' as const, activo: true }
const httpError = (status: number, message: string) => ({ isAxiosError: true, response: { status, data: { message } } })

beforeEach(() => {
  vi.resetAllMocks()
})

describe('UsersPage', () => {
  it('shows loading before the GET resolves, then only validated account data', async () => {
    let resolve!: (value: typeof assistant) => void
    vi.mocked(getAssistant).mockReturnValue(new Promise((done) => { resolve = done }))
    render(<UsersPage/>)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando información')
    expect(screen.queryByRole('heading', { name: 'Cuenta de asistente' })).not.toBeInTheDocument()
    resolve(assistant)
    expect(await screen.findByText('Nombre recibido')).toBeInTheDocument()
    expect(screen.getByText('recibido@backend.test')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Desactivar cuenta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Activar cuenta' })).not.toBeInTheDocument()
  })

  it('treats GET 404 as absence and starts the creation form empty', async () => {
    vi.mocked(getAssistant).mockRejectedValue(httpError(404, 'No existe una cuenta de asistente.'))
    render(<UsersPage/>)

    expect(await screen.findByText('No existe una cuenta de asistente registrada.')).toBeInTheDocument()
    const form = screen.getByRole('form', { name: 'Datos para crear cuenta de asistente' })
    for (const label of ['Nombre', 'Correo electrónico', 'Usuario', 'Contraseña']) {
      expect(within(form).getByLabelText(label)).toHaveValue('')
    }
    expect(screen.queryByRole('button', { name: 'Desactivar cuenta' })).not.toBeInTheDocument()
  })

  it.each([['invalid response', new Error('Invalid assistant response')], ['network', { isAxiosError: true }]])('shows a retryable error for %s', async (_label, cause) => {
    vi.mocked(getAssistant).mockRejectedValueOnce(cause).mockResolvedValueOnce(assistant)
    render(<UsersPage/>)

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la información.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Nombre recibido')).toBeInTheDocument()
    expect(getAssistant).toHaveBeenCalledTimes(2)
  })

  it('validates creation and sends only the confirmed POST fields', async () => {
    vi.mocked(getAssistant).mockRejectedValue(httpError(404, 'No existe una cuenta de asistente.'))
    vi.mocked(createAssistant).mockResolvedValue(assistant)
    render(<UsersPage/>)
    const form = await screen.findByRole('form', { name: 'Datos para crear cuenta de asistente' })
    fireEvent.click(within(form).getByRole('button', { name: 'Crear cuenta de asistente' }))
    expect(await within(form).findByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(createAssistant).not.toHaveBeenCalled()

    fireEvent.change(within(form).getByLabelText('Nombre'), { target: { value: 'Nombre recibido' } })
    fireEvent.change(within(form).getByLabelText('Correo electrónico'), { target: { value: 'recibido@backend.test' } })
    fireEvent.change(within(form).getByLabelText('Usuario'), { target: { value: 'recibido' } })
    fireEvent.change(within(form).getByLabelText('Contraseña'), { target: { value: 'clave-confirmada' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Crear cuenta de asistente' }))
    await waitFor(() => expect(createAssistant).toHaveBeenCalledWith({ name: 'Nombre recibido', email: 'recibido@backend.test', username: 'recibido', password: 'clave-confirmada' }))
    expect(await screen.findByText('Nombre recibido')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cuenta de asistente creada.')
  })

  it('rejects an invalid email and a short password before creating', async () => {
    vi.mocked(getAssistant).mockRejectedValue(httpError(404, 'No existe una cuenta de asistente.'))
    render(<UsersPage/>)
    const form = await screen.findByRole('form', { name: 'Datos para crear cuenta de asistente' })
    fireEvent.change(within(form).getByLabelText('Nombre'), { target: { value: 'Nombre recibido' } })
    fireEvent.change(within(form).getByLabelText('Correo electrónico'), { target: { value: 'correo-invalido' } })
    fireEvent.change(within(form).getByLabelText('Usuario'), { target: { value: 'recibido' } })
    fireEvent.change(within(form).getByLabelText('Contraseña'), { target: { value: 'short' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Crear cuenta de asistente' }))
    expect(await within(form).findByText('Ingresa un correo válido.')).toBeInTheDocument()
    expect(within(form).getByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
    expect(createAssistant).not.toHaveBeenCalled()
  })

  it.each([[409, 'Ya existe una cuenta de asistente registrada.'], [422, 'Los datos proporcionados no son válidos.']])('shows the backend %i error on creation', async (status, message) => {
    vi.mocked(getAssistant).mockRejectedValue(httpError(404, 'No existe una cuenta de asistente.'))
    vi.mocked(createAssistant).mockRejectedValue(httpError(status, message))
    render(<UsersPage/>)
    const form = await screen.findByRole('form', { name: 'Datos para crear cuenta de asistente' })
    fireEvent.change(within(form).getByLabelText('Nombre'), { target: { value: 'Nombre recibido' } })
    fireEvent.change(within(form).getByLabelText('Correo electrónico'), { target: { value: 'recibido@backend.test' } })
    fireEvent.change(within(form).getByLabelText('Usuario'), { target: { value: 'recibido' } })
    fireEvent.change(within(form).getByLabelText('Contraseña'), { target: { value: 'clave-confirmada' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Crear cuenta de asistente' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByText('Cuenta de asistente creada.')).not.toBeInTheDocument()
  })

  it('separates a creation network error from backend validation', async () => {
    vi.mocked(getAssistant).mockRejectedValue(httpError(404, 'No existe una cuenta de asistente.'))
    vi.mocked(createAssistant).mockRejectedValue({ isAxiosError: true })
    render(<UsersPage/>)
    const form = await screen.findByRole('form', { name: 'Datos para crear cuenta de asistente' })
    fireEvent.change(within(form).getByLabelText('Nombre'), { target: { value: 'Nombre recibido' } })
    fireEvent.change(within(form).getByLabelText('Correo electrónico'), { target: { value: 'recibido@backend.test' } })
    fireEvent.change(within(form).getByLabelText('Usuario'), { target: { value: 'recibido' } })
    fireEvent.change(within(form).getByLabelText('Contraseña'), { target: { value: 'clave-confirmada' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Crear cuenta de asistente' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('No fue posible comunicarse con el servidor.')
  })

  it('deactivates an active account and refreshes the real state', async () => {
    vi.mocked(getAssistant).mockResolvedValueOnce(assistant).mockResolvedValueOnce({ ...assistant, activo: false })
    vi.mocked(deactivateAssistant).mockResolvedValue()
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar cuenta' }))
    await waitFor(() => expect(deactivateAssistant).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('button', { name: 'Activar cuenta' })).toBeInTheDocument()
    expect(screen.getByText('Inactiva')).toBeInTheDocument()
  })

  it('activates an inactive account and handles an action conflict', async () => {
    vi.mocked(getAssistant).mockResolvedValue({ ...assistant, activo: false })
    vi.mocked(activateAssistant).mockRejectedValue(httpError(409, 'La cuenta ya está activa.'))
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Activar cuenta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La cuenta ya está activa.')
    expect(activateAssistant).toHaveBeenCalledTimes(1)
  })

  it('treats a status-action 404 as a reason to refresh the account', async () => {
    vi.mocked(getAssistant).mockResolvedValueOnce(assistant).mockRejectedValueOnce(httpError(404, 'No existe una cuenta de asistente.'))
    vi.mocked(deactivateAssistant).mockRejectedValue(httpError(404, 'No existe una cuenta de asistente.'))
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar cuenta' }))
    expect(await screen.findByText('No existe una cuenta de asistente registrada.')).toBeInTheDocument()
    expect(getAssistant).toHaveBeenCalledTimes(2)
  })

  it('validates password length and confirmation, then sends the confirmed payload and clears both fields', async () => {
    vi.mocked(getAssistant).mockResolvedValue(assistant)
    vi.mocked(changeAssistantPassword).mockResolvedValue()
    render(<UsersPage/>)
    const form = await screen.findByRole('form', { name: 'Cambiar contraseña de asistente' })
    fireEvent.change(within(form).getByLabelText('Nueva contraseña'), { target: { value: 'short' } })
    fireEvent.change(within(form).getByLabelText('Confirmar contraseña'), { target: { value: 'other' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Cambiar contraseña' }))
    expect(await within(form).findByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
    expect(changeAssistantPassword).not.toHaveBeenCalled()
    fireEvent.change(within(form).getByLabelText('Nueva contraseña'), { target: { value: 'clave-confirmada' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Cambiar contraseña' }))
    expect(await within(form).findByText('Las contraseñas deben coincidir.')).toBeInTheDocument()
    fireEvent.change(within(form).getByLabelText('Confirmar contraseña'), { target: { value: 'clave-confirmada' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Cambiar contraseña' }))
    await waitFor(() => expect(changeAssistantPassword).toHaveBeenCalledWith({ password: 'clave-confirmada', password_confirmation: 'clave-confirmada' }))
    await waitFor(() => expect(within(form).getByLabelText('Nueva contraseña')).toHaveValue(''))
    expect(within(form).getByLabelText('Confirmar contraseña')).toHaveValue('')
  })

  it('shows a backend 422 for password change without clearing the fields', async () => {
    vi.mocked(getAssistant).mockResolvedValue(assistant)
    vi.mocked(changeAssistantPassword).mockRejectedValue(httpError(422, 'La contraseña no cumple las reglas.'))
    render(<UsersPage/>)
    const form = await screen.findByRole('form', { name: 'Cambiar contraseña de asistente' })
    fireEvent.change(within(form).getByLabelText('Nueva contraseña'), { target: { value: 'clave-confirmada' } })
    fireEvent.change(within(form).getByLabelText('Confirmar contraseña'), { target: { value: 'clave-confirmada' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Cambiar contraseña' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('La contraseña no cumple las reglas.')
    expect(within(form).getByLabelText('Nueva contraseña')).toHaveValue('clave-confirmada')
  })
})
