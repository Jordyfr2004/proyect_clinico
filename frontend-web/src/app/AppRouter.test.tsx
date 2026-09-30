import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppRouter } from './AppRouter'
import { AUTH_FORBIDDEN_EVENT } from '../services/apiClient'
import { AuthContext, type AuthStatus } from '../features/auth/authContext'
import type { LoginValues } from '../features/auth/loginSchema'

function renderRouter(status: AuthStatus, path = '/', login: (values: LoginValues) => Promise<void> = async () => {}) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={{ status, user: null, sessionError: null, login, logout: async () => {} }}>
        <AppRouter/>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('AppRouter', () => {
  it('redirects unauthenticated users from protected pages to login', () => {
    renderRouter('guest', '/pacientes')
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument()
  })

  it('holds protected content while authentication is loading', () => {
    renderRouter('loading', '/pacientes')
    expect(screen.getByText('Verificando sesión…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Pacientes' })).not.toBeInTheDocument()
  })

  it('links public login to pending client registration and back', () => {
    renderRouter('guest', '/login')

    fireEvent.click(screen.getByRole('link', { name: 'Crear cuenta' }))
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument()
    expect(screen.getByText('El registro de clientes aún no está disponible.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Volver al inicio de sesión' }))
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument()
  })

  it('sends username and password and shows a backend 422 message', async () => {
    const login = vi.fn().mockRejectedValue({ isAxiosError: true, response: { status: 422, data: { message: 'Credenciales incorrectas.' } } })
    renderRouter('guest', '/login', login)

    fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: '1234567890' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'valid-password-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales incorrectas.')
    expect(login).toHaveBeenCalledWith({ username: '1234567890', password: 'valid-password-123' })

    fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: '0987654321' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a safe message when the login request cannot reach the server', async () => {
    const login = vi.fn().mockRejectedValue({ isAxiosError: true })
    renderRouter('guest', '/login', login)

    fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: '1234567890' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'valid-password-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible comunicarse con el servidor.')
  })

  it('renders the dashboard empty states for an authenticated session', () => {
    renderRouter('authenticated')

    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    expect(screen.getByText('Hora')).toBeInTheDocument()
    expect(screen.getByText('No hay citas para mostrar.')).toBeInTheDocument()
    expect(screen.getByText('No hay pacientes para mostrar.')).toBeInTheDocument()
  })

  it('shows a dismissible notice after a forbidden response without blocking the current page', () => {
    renderRouter('authenticated')

    act(() => window.dispatchEvent(new Event(AUTH_FORBIDDEN_EVENT)))

    expect(screen.getByRole('heading', { name: 'Acceso no autorizado' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    expect(screen.queryByRole('heading', { name: 'Acceso no autorizado' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
  })

  it('opens and closes the mobile navigation with Escape', () => {
    renderRouter('authenticated')
    const trigger = screen.getByRole('button', { name: 'Abrir menú' })

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
