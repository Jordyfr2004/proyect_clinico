import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UsersPage } from './UsersPage'
import { activateAssistant, changeAssistantPassword, createAssistant, deactivateAssistant, deleteAssistant, getAssistant } from './assistantService'

vi.mock('./assistantService', () => ({
  getAssistant: vi.fn(),
  createAssistant: vi.fn(),
  activateAssistant: vi.fn(),
  deactivateAssistant: vi.fn(),
  changeAssistantPassword: vi.fn(),
  deleteAssistant: vi.fn(),
}))

const assistant = { id: 'assistant-id', name: 'Nombre recibido', email: 'recibido@backend.test', username: 'recibido', role: 'asistente' as const, activo: true }
const httpError = (status: number, message: string) => ({ isAxiosError: true, response: { status, data: { message } } })

function fillPasswordForm() {
  const form = screen.getByRole('form', { name: 'Cambiar contraseña de asistente' })
  fireEvent.change(within(form).getByLabelText('Nueva contraseña'), { target: { value: 'clave-confirmada' } })
  fireEvent.change(within(form).getByLabelText('Confirmar contraseña'), { target: { value: 'clave-confirmada' } })
  return form
}

async function openCreateForm() {
  fireEvent.click(await screen.findByRole('button', { name: 'Crear asistente' }))
  return screen.findByRole('form', { name: 'Datos para crear cuenta de asistente' })
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('UsersPage', () => {
  it('requires explicit confirmation before deleting and allows Escape or cancel', async () => {
    vi.mocked(getAssistant).mockResolvedValue(assistant)
    render(<UsersPage/>)
    const trigger = await screen.findByRole('button', { name: 'Eliminar cuenta' })
    fireEvent.click(trigger)
    expect(deleteAssistant).not.toHaveBeenCalled()
    expect(screen.getByText('La cuenta será eliminada y sus sesiones activas se cerrarán. Esta acción no se puede deshacer.')).toBeInTheDocument()
    const cancel = screen.getByRole('button', { name: 'Cancelar eliminación' })
    expect(cancel).toHaveFocus()
    fireEvent.keyDown(cancel, { key: 'Escape' })
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Confirmar eliminación' })).not.toBeInTheDocument()
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar eliminación' }))
    expect(trigger).toHaveFocus()
    expect(deleteAssistant).not.toHaveBeenCalled()
  })

  it('prevents duplicate DELETE requests while pending', async () => {
    vi.mocked(getAssistant).mockResolvedValue(assistant)
    vi.mocked(deleteAssistant).mockReturnValue(new Promise(() => {}))
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar cuenta' }))
    const confirm = screen.getByRole('button', { name: 'Confirmar eliminación' })
    fireEvent.click(confirm)
    expect(screen.getByRole('button', { name: 'Eliminando…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar eliminación' })).toBeDisabled()
    fireEvent.click(confirm)
    expect(deleteAssistant).toHaveBeenCalledTimes(1)
  })

  it('reconsults after DELETE success and allows creating a new assistant only after GET 404', async () => {
    vi.mocked(getAssistant).mockResolvedValueOnce(assistant).mockRejectedValueOnce(httpError(404, 'No existe una cuenta de asistente.'))
    vi.mocked(deleteAssistant).mockResolvedValue()
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar cuenta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))
    expect(await screen.findByText('No existe una cuenta de asistente registrada.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear asistente' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cuenta de asistente eliminada correctamente.')
    expect(getAssistant).toHaveBeenCalledTimes(2)
  })

  it('reconsults after DELETE 404 and displays the useful backend message', async () => {
    vi.mocked(getAssistant).mockResolvedValueOnce(assistant).mockRejectedValueOnce(httpError(404, 'No existe una cuenta de asistente.'))
    vi.mocked(deleteAssistant).mockRejectedValue(httpError(404, 'No existe una cuenta de asistente.'))
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar cuenta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))
    expect(await screen.findByText('No existe una cuenta de asistente registrada.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('No existe una cuenta de asistente.')
    expect(getAssistant).toHaveBeenCalledTimes(2)
  })

  it('keeps the real account on DELETE network failure without exposing sensitive response fields', async () => {
    vi.mocked(getAssistant).mockResolvedValue({ ...assistant, password: 'secret-password', access_token: 'secret-token' } as typeof assistant)
    vi.mocked(deleteAssistant).mockRejectedValue({ isAxiosError: true })
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar cuenta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible comunicarse con el servidor.')
    expect(screen.getByRole('heading', { name: 'Cuenta de asistente' })).toBeInTheDocument()
    expect(screen.queryByText('secret-password')).not.toBeInTheDocument()
    expect(screen.queryByText('secret-token')).not.toBeInTheDocument()
    expect(getAssistant).toHaveBeenCalledTimes(1)
  })
  it('sends only one creation request on repeated form submission', async () => {
    vi.mocked(getAssistant).mockRejectedValue(httpError(404, 'No existe una cuenta de asistente.'))
    vi.mocked(createAssistant).mockReturnValue(new Promise(() => {}))
    render(<UsersPage/>)
    const form = await openCreateForm()
    fireEvent.change(within(form).getByLabelText('Nombre'), { target: { value: assistant.name } })
    fireEvent.change(within(form).getByLabelText('Correo electrónico'), { target: { value: assistant.email } })
    fireEvent.change(within(form).getByLabelText('Usuario'), { target: { value: assistant.username } })
    fireEvent.change(within(form).getByLabelText('Contraseña'), { target: { value: 'clave-confirmada' } })
    fireEvent.submit(form)
    expect(await within(form).findByRole('button', { name: 'Creando cuenta…' })).toBeDisabled()
    fireEvent.submit(form)
    await waitFor(() => expect(createAssistant).toHaveBeenCalledTimes(1))
  })

  it('sends only one password request on repeated form submission', async () => {
    vi.mocked(getAssistant).mockResolvedValue(assistant)
    vi.mocked(changeAssistantPassword).mockReturnValue(new Promise(() => {}))
    render(<UsersPage/>)
    const form = await screen.findByRole('form', { name: 'Cambiar contraseña de asistente' })
    fireEvent.change(within(form).getByLabelText('Nueva contraseña'), { target: { value: 'clave-confirmada' } })
    fireEvent.change(within(form).getByLabelText('Confirmar contraseña'), { target: { value: 'clave-confirmada' } })
    fireEvent.submit(form)
    expect(await within(form).findByRole('button', { name: 'Guardando…' })).toBeDisabled()
    fireEvent.submit(form)
    await waitFor(() => expect(changeAssistantPassword).toHaveBeenCalledTimes(1))
  })

  it('blocks deletion and status changes while a password change is pending', async () => {
    vi.mocked(getAssistant).mockResolvedValue(assistant)
    vi.mocked(changeAssistantPassword).mockReturnValue(new Promise(() => {}))
    render(<UsersPage/>)
    await screen.findByRole('button', { name: 'Eliminar cuenta' })
    fireEvent.submit(fillPasswordForm())
    await waitFor(() => expect(changeAssistantPassword).toHaveBeenCalledTimes(1))
    const deleteButton = screen.getByRole('button', { name: 'Eliminar cuenta' })
    const statusButton = screen.getByRole('button', { name: 'Desactivar cuenta' })
    expect(deleteButton).toBeDisabled()
    expect(statusButton).toBeDisabled()
    fireEvent.click(deleteButton)
    fireEvent.click(statusButton)
    expect(screen.queryByRole('button', { name: 'Confirmar eliminación' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar desactivación' })).not.toBeInTheDocument()
    expect(deleteAssistant).not.toHaveBeenCalled()
    expect(deactivateAssistant).not.toHaveBeenCalled()
  })

  it('blocks password changes while deactivation is pending', async () => {
    vi.mocked(getAssistant).mockResolvedValue(assistant)
    vi.mocked(deactivateAssistant).mockReturnValue(new Promise(() => {}))
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar cuenta' }))
    const confirm = screen.getByRole('button', { name: 'Confirmar desactivación' })
    fireEvent.click(confirm)
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeDisabled()
    await act(async () => { fireEvent.submit(fillPasswordForm()) })
    await waitFor(() => expect(deactivateAssistant).toHaveBeenCalledTimes(1))
    expect(changeAssistantPassword).not.toHaveBeenCalled()
    fireEvent.click(confirm)
    expect(deactivateAssistant).toHaveBeenCalledTimes(1)
  })

  it('blocks password changes while deletion is pending', async () => {
    vi.mocked(getAssistant).mockResolvedValue(assistant)
    vi.mocked(deleteAssistant).mockReturnValue(new Promise(() => {}))
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar cuenta' }))
    const confirm = screen.getByRole('button', { name: 'Confirmar eliminación' })
    fireEvent.click(confirm)
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeDisabled()
    await act(async () => { fireEvent.submit(fillPasswordForm()) })
    expect(deleteAssistant).toHaveBeenCalledTimes(1)
    expect(changeAssistantPassword).not.toHaveBeenCalled()
    fireEvent.click(confirm)
    expect(deleteAssistant).toHaveBeenCalledTimes(1)
  })
  it('allows cancelling deactivation with Escape and restores focus without a request', async () => {
    vi.mocked(getAssistant).mockResolvedValue(assistant)
    render(<UsersPage/>)
    const trigger = await screen.findByRole('button', { name: 'Desactivar cuenta' })
    fireEvent.click(trigger)
    const cancel = screen.getByRole('button', { name: 'Cancelar' })
    expect(cancel).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(cancel, { key: 'Escape' })
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Confirmar desactivación' })).not.toBeInTheDocument()
    expect(deactivateAssistant).not.toHaveBeenCalled()
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(trigger).toHaveFocus()
    expect(deactivateAssistant).not.toHaveBeenCalled()
  })

  it('prevents repeated deactivation requests while confirmation is pending', async () => {
    vi.mocked(getAssistant).mockResolvedValue(assistant)
    vi.mocked(deactivateAssistant).mockReturnValue(new Promise(() => {}))
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar cuenta' }))
    const confirm = screen.getByRole('button', { name: 'Confirmar desactivación' })
    fireEvent.click(confirm)
    expect(confirm).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    fireEvent.click(confirm)
    expect(deactivateAssistant).toHaveBeenCalledTimes(1)
  })

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
    const form = await openCreateForm()
    for (const label of ['Nombre', 'Correo electrónico', 'Usuario', 'Contraseña']) {
      expect(within(form).getByLabelText(label)).toHaveValue('')
    }
    expect(screen.queryByRole('button', { name: 'Desactivar cuenta' })).not.toBeInTheDocument()
  })

  it('opens assistant creation in a dialog and restores focus on Escape', async () => {
    vi.mocked(getAssistant).mockRejectedValue(httpError(404, 'No existe una cuenta de asistente.'))
    render(<UsersPage/>)
    const trigger = await screen.findByRole('button', { name: 'Crear asistente' })
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Crear cuenta de asistente' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Crear cuenta de asistente' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
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
    const form = await openCreateForm()
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
    const form = await openCreateForm()
    fireEvent.change(within(form).getByLabelText('Nombre'), { target: { value: 'Nombre recibido' } })
    fireEvent.change(within(form).getByLabelText('Correo electrónico'), { target: { value: 'correo-invalido' } })
    fireEvent.change(within(form).getByLabelText('Usuario'), { target: { value: 'recibido' } })
    fireEvent.change(within(form).getByLabelText('Contraseña'), { target: { value: 'short' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Crear cuenta de asistente' }))
    expect(await within(form).findByText('Ingresa un correo válido.')).toBeInTheDocument()
    expect(within(form).getByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
    expect(createAssistant).not.toHaveBeenCalled()
  })

  it.each([[422, 'Los datos proporcionados no son válidos.']])('shows the backend %i error on creation', async (status, message) => {
    vi.mocked(getAssistant).mockRejectedValue(httpError(404, 'No existe una cuenta de asistente.'))
    vi.mocked(createAssistant).mockRejectedValue(httpError(status, message))
    render(<UsersPage/>)
    const form = await openCreateForm()
    fireEvent.change(within(form).getByLabelText('Nombre'), { target: { value: 'Nombre recibido' } })
    fireEvent.change(within(form).getByLabelText('Correo electrónico'), { target: { value: 'recibido@backend.test' } })
    fireEvent.change(within(form).getByLabelText('Usuario'), { target: { value: 'recibido' } })
    fireEvent.change(within(form).getByLabelText('Contraseña'), { target: { value: 'clave-confirmada' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Crear cuenta de asistente' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByText('Cuenta de asistente creada.')).not.toBeInTheDocument()
  })

  it('reconsults a conflicting creation and shows the existing account', async () => {
    vi.mocked(getAssistant).mockRejectedValueOnce(httpError(404, 'No existe una cuenta de asistente.')).mockResolvedValueOnce(assistant)
    vi.mocked(createAssistant).mockRejectedValue(httpError(409, 'Ya existe una cuenta de asistente registrada.'))
    render(<UsersPage/>)
    const form = await openCreateForm()
    fireEvent.change(within(form).getByLabelText('Nombre'), { target: { value: assistant.name } })
    fireEvent.change(within(form).getByLabelText('Correo electrónico'), { target: { value: assistant.email } })
    fireEvent.change(within(form).getByLabelText('Usuario'), { target: { value: assistant.username } })
    fireEvent.change(within(form).getByLabelText('Contraseña'), { target: { value: 'clave-confirmada' } })
    fireEvent.submit(form)
    expect(await screen.findByText(assistant.name)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cuenta de asistente' })).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Datos para crear cuenta de asistente' })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Ya existe una cuenta de asistente registrada.')
    expect(getAssistant).toHaveBeenCalledTimes(2)
    expect(createAssistant).toHaveBeenCalledTimes(1)
  })

  it('separates a creation network error from backend validation', async () => {
    vi.mocked(getAssistant).mockRejectedValue(httpError(404, 'No existe una cuenta de asistente.'))
    vi.mocked(createAssistant).mockRejectedValue({ isAxiosError: true })
    render(<UsersPage/>)
    const form = await openCreateForm()
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
    expect(deactivateAssistant).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desactivación' }))
    await waitFor(() => expect(deactivateAssistant).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('button', { name: 'Activar cuenta' })).toBeInTheDocument()
    expect(screen.getByText('Inactiva')).toBeInTheDocument()
  })

  it('activates an inactive account and handles an action conflict', async () => {
    vi.mocked(getAssistant).mockResolvedValueOnce({ ...assistant, activo: false }).mockResolvedValueOnce(assistant)
    vi.mocked(activateAssistant).mockRejectedValue(httpError(409, 'La cuenta ya está activa.'))
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Activar cuenta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La cuenta ya está activa.')
    expect(await screen.findByText('Activa')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Desactivar cuenta' })).toBeInTheDocument()
    expect(getAssistant).toHaveBeenCalledTimes(2)
    expect(activateAssistant).toHaveBeenCalledTimes(1)
  })

  it('reconsults after deactivation conflicts and reflects the current account status', async () => {
    vi.mocked(getAssistant).mockResolvedValueOnce(assistant).mockResolvedValueOnce({ ...assistant, activo: false })
    vi.mocked(deactivateAssistant).mockRejectedValue(httpError(409, 'La cuenta ya está inactiva.'))
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar cuenta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desactivación' }))
    expect(await screen.findByRole('button', { name: 'Activar cuenta' })).toBeInTheDocument()
    expect(screen.getByText('Inactiva')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('La cuenta ya está inactiva.')
    expect(getAssistant).toHaveBeenCalledTimes(2)
  })

  it('treats a status-action 404 as a reason to refresh the account', async () => {
    vi.mocked(getAssistant).mockResolvedValueOnce(assistant).mockRejectedValueOnce(httpError(404, 'No existe una cuenta de asistente.'))
    vi.mocked(deactivateAssistant).mockRejectedValue(httpError(404, 'No existe una cuenta de asistente.'))
    render(<UsersPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar cuenta' }))
    expect(deactivateAssistant).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desactivación' }))
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
