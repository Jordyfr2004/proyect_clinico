import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppRouter } from '../app/AppRouter'
import { AuthProvider } from '../features/auth/AuthProvider'
import * as authService from '../features/auth/authService'
import { setAccessToken } from '../features/auth/authStorage'
import type { AuthUser } from '../features/auth/authService'

vi.mock('../features/auth/authService', () => ({ login: vi.fn(), getCurrentUser: vi.fn(), logout: vi.fn() }))

const doctor: AuthUser = { id: 'doctor-1', name: 'María López', username: 'mlopez', email: 'maria@clinica.test', role: 'doctora', paciente_id: null, activo: true, foto_perfil_url: null }

function renderStaff(user: AuthUser) {
  setAccessToken('token-existente')
  vi.mocked(authService.getCurrentUser).mockResolvedValue(user)
  render(<MemoryRouter initialEntries={['/']}><AuthProvider><AppRouter/></AuthProvider></MemoryRouter>)
}

beforeEach(() => {
  sessionStorage.clear()
  vi.resetAllMocks()
})

describe('menú de perfil', () => {
  it('separates account details from the existing photo controls for the doctor', async () => {
    renderStaff(doctor)
    const trigger = await screen.findByRole('button', { name: 'Abrir menú de perfil' })
    fireEvent.click(trigger)
    const menu = screen.getByRole('menu', { name: 'Opciones de usuario' })
    expect(within(menu).getByText('María López')).toBeInTheDocument()
    expect(within(menu).getByText('maria@clinica.test')).toBeInTheDocument()
    expect(within(menu).getByText('Personal clínico')).toBeInTheDocument()
    expect(within(menu).queryByText('Doctora')).not.toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: /Cambiar fotografía/ })).toBeInTheDocument()
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Mi perfil' }))
    const profile = screen.getByRole('dialog', { name: 'Mi perfil' })
    expect(within(profile).getByText('maria@clinica.test')).toBeInTheDocument()
    expect(within(profile).getByText('Personal clínico')).toBeInTheDocument()
    expect(within(profile).queryByLabelText('Seleccionar foto')).not.toBeInTheDocument()
    fireEvent.click(within(profile).getByRole('button', { name: 'Volver' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de perfil' }))
    fireEvent.click(within(screen.getByRole('menu', { name: 'Opciones de usuario' })).getByRole('menuitem', { name: /Cambiar fotografía/ }))
    expect(within(screen.getByRole('dialog', { name: 'Fotografía de perfil' })).getByText('Personal clínico')).toBeInTheDocument()
    expect(screen.getByText('Seleccionar foto')).toBeInTheDocument()
  })

  it('shows the assistant role and an honest fallback when no email exists', async () => {
    renderStaff({ ...doctor, id: 'assistant-1', name: 'Ana Ruiz', email: null, role: 'asistente' })
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir menú de perfil' }))
    const menu = screen.getByRole('menu', { name: 'Opciones de usuario' })
    expect(within(menu).getByText('Ana Ruiz')).toBeInTheDocument()
    expect(within(menu).getByText('Personal clínico')).toBeInTheDocument()
    expect(within(menu).getByText('Correo no registrado')).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })
})
