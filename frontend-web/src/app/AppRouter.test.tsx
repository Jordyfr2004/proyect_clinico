import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppRouter } from './AppRouter'

describe('AppRouter', () => {
  it('redirects unauthenticated users from protected pages to login', () => {
    render(
      <MemoryRouter initialEntries={['/pacientes']}>
        <AppRouter authStatus="guest" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument()
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

  it('shows access denied after a forbidden response', () => {
    render(<MemoryRouter><AppRouter accessDenied authStatus="authenticated" /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'Acceso no autorizado' })).toBeInTheDocument()
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
