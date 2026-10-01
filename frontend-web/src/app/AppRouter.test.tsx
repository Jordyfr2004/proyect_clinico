import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppRouter } from './AppRouter'
import { AUTH_FORBIDDEN_EVENT } from '../services/apiClient'
import { AuthContext, type AuthStatus } from '../features/auth/authContext'
import type { LoginValues } from '../features/auth/loginSchema'
import type { AuthUser, UserRole } from '../features/auth/authService'

function renderRouter(status: AuthStatus, path = '/', login: (values: LoginValues) => Promise<void> = async () => {}, user: AuthUser | null = null) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={{ status, user, sessionError: null, login, logout: async () => {} }}>
        <AppRouter/>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

function authenticatedUser(role: UserRole): AuthUser {
  return { id: 'user-id', name: 'Nombre de sesión', username: 'usuario', role, paciente_id: null, activo: true }
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

  it('explains pending password recovery without presenting a working form', () => {
    renderRouter('guest', '/recuperar-contrasena')

    expect(screen.getByRole('heading', { name: 'Recupera tu acceso' })).toBeInTheDocument()
    expect(screen.getByText('La recuperación de contraseña todavía no está disponible.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Integración pendiente')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Solicitar recuperación' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Volver al inicio de sesión' }))
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument()
  })

  it('sends username and password and shows a backend 422 message', async () => {
    const login = vi.fn().mockRejectedValue({ isAxiosError: true, response: { status: 422, data: { message: 'Credenciales incorrectas.' } } })
    renderRouter('guest', '/login', login)

    fireEvent.change(screen.getByLabelText('Usuario o cédula'), { target: { value: '1234567890' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'valid-password-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales incorrectas.')
    expect(login).toHaveBeenCalledWith({ username: '1234567890', password: 'valid-password-123' })

    fireEvent.change(screen.getByLabelText('Usuario o cédula'), { target: { value: '0987654321' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a safe message when the login request cannot reach the server', async () => {
    const login = vi.fn().mockRejectedValue({ isAxiosError: true })
    renderRouter('guest', '/login', login)

    fireEvent.change(screen.getByLabelText('Usuario o cédula'), { target: { value: '1234567890' } })
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

  it('presents the single assistant account as pending without management actions', () => {
    renderRouter('authenticated', '/usuarios', undefined, authenticatedUser('doctora'))

    expect(screen.getByRole('heading', { name: 'Cuenta de asistente' })).toBeInTheDocument()
    expect(screen.getByText('La clínica utiliza una única cuenta con rol asistente.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Integración pendiente')
    expect(screen.queryByText('No hay usuarios para mostrar.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /crear|activar|desactivar|contraseña/i })).not.toBeInTheDocument()
  })

  it('keeps pending modules honest and patient registration disabled', () => {
    renderRouter('authenticated', '/pacientes', undefined, authenticatedUser('asistente'))

    expect(screen.getByRole('status')).toHaveTextContent('Integración pendiente')
    expect(screen.getByText('No hay pacientes registrados.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar paciente' })).toBeDisabled()
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
    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it.each([
    ['doctora', true, true, 'Doctora'],
    ['asistente', false, true, 'Asistente'],
    ['paciente', false, false, 'Paciente'],
  ] as const)('shows confirmed navigation and real identity for %s', (role, seesUsers, seesPatients, label) => {
    renderRouter('authenticated', '/', undefined, authenticatedUser(role))

    const navigation = within(screen.getByRole('navigation', { name: 'Navegación principal' }))
    expect(Boolean(navigation.queryByRole('link', { name: 'Usuarios' }))).toBe(seesUsers)
    expect(Boolean(navigation.queryByRole('link', { name: 'Pacientes' }))).toBe(seesPatients)
    expect(screen.queryByRole('link', { name: 'Registrar paciente' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('link', { name: 'Ir a pacientes' })).toHaveLength(seesPatients ? 2 : 0)
    expect(screen.getByRole('link', { name: 'Ir a la agenda' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ayuda' })).not.toBeInTheDocument()
    expect(screen.getByText('Nombre de sesión')).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByText(label)).toBeInTheDocument()
  })

  it.each([
    ['doctora', '/usuarios', true],
    ['doctora', '/pacientes', true],
    ['asistente', '/usuarios', false],
    ['asistente', '/pacientes', true],
    ['paciente', '/usuarios', false],
    ['paciente', '/pacientes', false],
    ['paciente', '/pacientes/patient-id/historial', false],
    ['doctora', '/pacientes/patient-id/resumen', true],
    ['asistente', '/pacientes/patient-id/historial', true],
  ] as const)('applies confirmed access for %s at %s', (role, route, permitted) => {
    renderRouter('authenticated', route, undefined, authenticatedUser(role))

    if (permitted) {
      expect(screen.getByRole('heading', { name: route === '/usuarios' ? 'Usuarios' : route.startsWith('/pacientes/') ? 'Paciente sin información disponible' : 'Pacientes' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Acceso no autorizado' })).not.toBeInTheDocument()
    } else {
      expect(screen.getByRole('heading', { name: 'Acceso no autorizado' })).toBeInTheDocument()
      const back = screen.getByRole('link', { name: 'Volver al Dashboard' })
      expect(back).toHaveAttribute('href', '/')
      fireEvent.click(back)
      expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    }
  })

})
