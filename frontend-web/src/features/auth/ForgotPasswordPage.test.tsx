import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { requestPasswordReset, resetPassword } from './authService'

vi.mock('./authService', () => ({ requestPasswordReset: vi.fn(), resetPassword: vi.fn() }))
beforeEach(() => { vi.resetAllMocks() })
const renderPage = () => render(<MemoryRouter><ForgotPasswordPage/></MemoryRouter>)

describe('ForgotPasswordPage', () => {
  it('validates email and completes the two real backend steps without generating a code', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue('Si existe una cuenta activa con ese correo, recibirás un código de recuperación.')
    vi.mocked(resetPassword).mockResolvedValue('Contraseña actualizada.')
    renderPage()
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'incorrecto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar código' }))
    expect(await screen.findByText('Ingresa un correo válido.')).toBeInTheDocument()
    expect(requestPasswordReset).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'persona@backend.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar código' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Si existe una cuenta activa')
    expect(requestPasswordReset).toHaveBeenCalledExactlyOnceWith('persona@backend.test')
    fireEvent.change(screen.getByLabelText('Código de recuperación'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'clave-confirmada' } })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'clave-confirmada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))
    await waitFor(() => expect(resetPassword).toHaveBeenCalledExactlyOnceWith({ email: 'persona@backend.test', code: '123456', password: 'clave-confirmada', password_confirmation: 'clave-confirmada' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Contraseña actualizada.')
  })

  it.each([[429, 'Demasiados intentos.'], [503, 'Servicio no disponible.']] as const)('shows backend HTTP %i without advancing the flow', async (status, message) => {
    vi.mocked(requestPasswordReset).mockRejectedValue({ isAxiosError: true, response: { status, data: { message } } })
    renderPage()
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'persona@backend.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar código' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByLabelText('Código de recuperación')).not.toBeInTheDocument()
  })
})
