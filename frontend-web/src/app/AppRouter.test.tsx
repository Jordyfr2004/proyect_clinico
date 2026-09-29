import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppRouter } from './AppRouter'
import { AUTH_FORBIDDEN_EVENT } from '../services/apiClient'

describe('AppRouter', () => {
  it('redirects unauthenticated users from protected pages to login', () => {
    render(
      <MemoryRouter initialEntries={['/pacientes']}>
        <AppRouter authStatus="guest" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument()
  })

  it('links public login to pending client registration and back', () => {
    render(<MemoryRouter initialEntries={['/login']}><AppRouter authStatus="guest"/></MemoryRouter>)

    fireEvent.click(screen.getByRole('link', { name: 'Crear cuenta' }))
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument()
    expect(screen.getByText('El registro de clientes aún no está disponible.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Volver al inicio de sesión' }))
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument()
  })

  it('clears the pending integration notice when login values change after submission', async () => {
    render(<MemoryRouter initialEntries={['/login']}><AppRouter authStatus="guest"/></MemoryRouter>)

    fireEvent.change(screen.getByLabelText(/Correo electr/i), { target: { value: 'usuario@ejemplo.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'valid-password-123' } })
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesi/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('Integración pendiente')

    fireEvent.change(screen.getByLabelText(/Correo electr/i), { target: { value: 'otro@ejemplo.com' } })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders the dashboard empty states for an authenticated session', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRouter authStatus="authenticated" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    expect(screen.getByText('Hora')).toBeInTheDocument()
    expect(screen.getByText('No hay citas para mostrar.')).toBeInTheDocument()
    expect(screen.getByText('No hay pacientes para mostrar.')).toBeInTheDocument()
  })

  it('shows a dismissible notice after a forbidden response without blocking the current page', () => {
    render(<MemoryRouter><AppRouter authStatus="authenticated" /></MemoryRouter>)

    act(() => window.dispatchEvent(new Event(AUTH_FORBIDDEN_EVENT)))

    expect(screen.getByRole('heading', { name: 'Acceso no autorizado' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    expect(screen.queryByRole('heading', { name: 'Acceso no autorizado' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
  })

  it('opens and closes the mobile navigation with Escape', () => {
    render(<MemoryRouter><AppRouter authStatus="authenticated" /></MemoryRouter>)
    const trigger = screen.getByRole('button', { name: 'Abrir menú' })

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
