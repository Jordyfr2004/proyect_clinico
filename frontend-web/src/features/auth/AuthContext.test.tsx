import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppRouter } from '../../app/AppRouter'
import { AUTH_UNAUTHORIZED_EVENT } from '../../services/apiClient'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './authContext'
import * as authService from './authService'
import { getAccessToken, setAccessToken } from './authStorage'
import type { AuthUser } from './authService'

vi.mock('./authService', () => ({ login: vi.fn(), getCurrentUser: vi.fn(), logout: vi.fn() }))

const confirmedUser: AuthUser = { id: 'user-id', name: 'Doctora', username: 'doctora', role: 'doctora', paciente_id: null, activo: true }

function SessionProbe() {
  const { status, user, sessionError, login, logout } = useAuth()
  return <>
    <span data-testid="auth-status">{status}</span>
    <span data-testid="auth-user">{user ? `${user.role}:${user.paciente_id ?? 'null'}:${user.activo}` : 'none'}</span>
    {sessionError ? <span role="alert">{sessionError}</span> : null}
    <button onClick={() => { void login({ username: '1234567890', password: 'valid-password-123' }) }}>Login</button>
    <button onClick={() => { void logout() }}>Logout</button>
  </>
}

beforeEach(() => {
  sessionStorage.clear()
  vi.resetAllMocks()
})

describe('AuthProvider', () => {
  it('moves from login to the protected area after a successful response', async () => {
    vi.mocked(authService.login).mockResolvedValue({ message: 'Inicio de sesión correcto.', token_type: 'Bearer', access_token: 'token-confirmado', user: confirmedUser })
    render(<MemoryRouter initialEntries={['/login']}><AuthProvider><AppRouter/></AuthProvider></MemoryRouter>)

    fireEvent.change(await screen.findByLabelText('Usuario o cédula'), { target: { value: '1234567890' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'valid-password-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    expect(getAccessToken()).toBe('token-confirmado')
  })

  it('stores a successful login token and keeps the user in React state', async () => {
    vi.mocked(authService.login).mockResolvedValue({ message: 'Inicio de sesión correcto.', token_type: 'Bearer', access_token: 'token-confirmado', user: confirmedUser })
    render(<AuthProvider><SessionProbe/></AuthProvider>)

    expect(await screen.findByText('guest')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByText('authenticated')).toBeInTheDocument()
    expect(getAccessToken()).toBe('token-confirmado')
    expect(sessionStorage.length).toBe(1)
    expect(screen.getByTestId('auth-user')).toHaveTextContent('doctora:null:true')
    expect([...Array(sessionStorage.length)].map((_, index) => sessionStorage.key(index))).toEqual(['clinic.access_token'])
    expect(vi.mocked(authService.login)).toHaveBeenCalledWith({ username: '1234567890', password: 'valid-password-123' })
  })

  it('restores an existing session through GET /user without exposing protected content while loading', async () => {
    setAccessToken('token-existente')
    let resolveUser!: (user: AuthUser) => void
    vi.mocked(authService.getCurrentUser).mockReturnValue(new Promise((resolve) => { resolveUser = resolve }))
    render(<AuthProvider><SessionProbe/></AuthProvider>)

    expect(screen.getByTestId('auth-status')).toHaveTextContent('loading')
    await act(async () => { resolveUser(confirmedUser) })

    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('auth-user')).toHaveTextContent('doctora:null:true')
    expect(vi.mocked(authService.getCurrentUser)).toHaveBeenCalledOnce()
  })

  it('clears an existing token when GET /user returns 401', async () => {
    setAccessToken('token-vencido')
    vi.mocked(authService.getCurrentUser).mockRejectedValue({ isAxiosError: true, response: { status: 401 } })
    render(<AuthProvider><SessionProbe/></AuthProvider>)

    expect(await screen.findByText('guest')).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
    expect(screen.getByTestId('auth-user')).toHaveTextContent('none')
  })

  it('drops to guest and explains a network failure during session restoration', async () => {
    setAccessToken('token-sin-verificar')
    vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('network'))
    render(<AuthProvider><SessionProbe/></AuthProvider>)

    expect(await screen.findByText('guest')).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('No fue posible verificar la sesión')
  })

  it('clears local session even when the logout request fails', async () => {
    setAccessToken('token-existente')
    vi.mocked(authService.getCurrentUser).mockResolvedValue(confirmedUser)
    vi.mocked(authService.logout).mockRejectedValue(new Error('network'))
    render(<AuthProvider><SessionProbe/></AuthProvider>)

    expect(await screen.findByText('authenticated')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))

    expect(await screen.findByText('guest')).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
    expect(screen.getByTestId('auth-user')).toHaveTextContent('none')
  })

  it('returns to login after logout even if the server request fails', async () => {
    setAccessToken('token-existente')
    vi.mocked(authService.getCurrentUser).mockResolvedValue(confirmedUser)
    vi.mocked(authService.logout).mockRejectedValue(new Error('network'))
    render(<MemoryRouter initialEntries={['/']}><AuthProvider><AppRouter/></AuthProvider></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
  })

  it('clears the session when an authenticated request publishes a 401 event', async () => {
    setAccessToken('token-existente')
    vi.mocked(authService.getCurrentUser).mockResolvedValue(confirmedUser)
    render(<AuthProvider><SessionProbe/></AuthProvider>)

    expect(await screen.findByText('authenticated')).toBeInTheDocument()
    act(() => window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT)))

    expect(screen.getByTestId('auth-status')).toHaveTextContent('guest')
    expect(getAccessToken()).toBeNull()
  })
})
