import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppRouter } from './AppRouter'
import { AUTH_FORBIDDEN_EVENT } from '../services/apiClient'
import { AuthContext, type AuthStatus } from '../features/auth/authContext'
import type { LoginValues } from '../features/auth/loginSchema'
import type { AuthUser, UserRole } from '../features/auth/authService'
import { getPatient } from '../features/patients/patientService'
import { getClinicalHistoryByPatient } from '../features/clinical-history/clinicalHistoryService'

vi.mock('../features/assistant/assistantService', () => ({
  getAssistant: vi.fn(() => new Promise(() => {})),
}))
vi.mock('../features/patients/patientService', () => ({
  getPatients: vi.fn(() => Promise.resolve([])),
  getPatient: vi.fn(() => new Promise(() => {})),
}))
vi.mock('../features/agenda/agendaService', () => ({
  getAgendaMonth: vi.fn(() => Promise.resolve([])),
  getPendingRequests: vi.fn(() => Promise.resolve([])),
}))
vi.mock('../features/activities/activityService', () => ({
  getActivities: vi.fn(() => Promise.resolve([])),
  getActivityTotal: vi.fn(() => Promise.resolve({ total: '0' })),
}))
vi.mock('../features/clinical-history/clinicalHistoryService', () => ({
  getClinicalHistoryByPatient: vi.fn(() => new Promise(() => {})),
  createClinicalHistory: vi.fn(),
  updateClinicalHistory: vi.fn(),
}))

function renderRouter(status: AuthStatus, path = '/', login: (values: LoginValues) => Promise<void> = async () => {}, user: AuthUser | null = authenticatedUser('doctora')) {
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
  it('loads the real history section through the existing patient route for the doctor', async () => {
    vi.mocked(getPatient).mockResolvedValueOnce({ id: 'patient-id', codigo_paciente: '001', nombres: 'Nombre recibido', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: null })
    vi.mocked(getClinicalHistoryByPatient).mockResolvedValueOnce({ id: 'history-id', paciente_id: 'patient-id', sexo: null, lugar_nacimiento: null, antecedentes_enfermedades: null, cirugias: null, medicacion_actual: 'Dato recibido' })
    renderRouter('authenticated', '/pacientes/patient-id/historial', undefined, authenticatedUser('doctora'))
    expect(await screen.findByText('Dato recibido')).toBeInTheDocument()
    expect(getClinicalHistoryByPatient).toHaveBeenCalledWith('patient-id')
    expect(screen.queryByText('Integración pendiente')).not.toBeInTheDocument()
  })
  it('redirects unauthenticated users from protected pages to login', () => {
    renderRouter('guest', '/pacientes')
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument()
  })

  it('holds protected content while authentication is loading', () => {
    renderRouter('loading', '/pacientes')
    expect(screen.getByText('Verificando sesión…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Pacientes' })).not.toBeInTheDocument()
  })

  it.each(['/login', '/registro', '/mi-perfil'])('does not expose patient account flows at %s', (path) => {
    renderRouter('guest', path)
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Registro de paciente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mi perfil' })).not.toBeInTheDocument()
  })

  it.each(['/', '/agenda', '/actividades', '/reportes', '/configuracion', '/usuarios', '/pacientes', '/pacientes/patient-id/historial', '/mi-perfil', '/registro'])('blocks the patient before mounting the administrative shell at %s', (path) => {
    renderRouter('authenticated', path, undefined, authenticatedUser('paciente'))
    expect(screen.getByRole('heading', { name: 'Este portal está disponible para el personal de la clínica.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled()
    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
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

  it('redirects authenticated users away from password recovery', () => {
    renderRouter('authenticated', '/recuperar-contrasena', undefined, authenticatedUser('doctora'))

    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Recupera tu acceso' })).not.toBeInTheDocument()
  })

  it('holds password recovery while the session is loading', () => {
    renderRouter('loading', '/recuperar-contrasena')

    expect(screen.getByText('Verificando sesión…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Recupera tu acceso' })).not.toBeInTheDocument()
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

  it('separates available modules from pending integrations without claiming there are no records', () => {
    renderRouter('authenticated')

    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Módulos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Disponibles ahora' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'En preparación' })).toBeInTheDocument()
    expect(screen.getByText('Integración pendiente de backend.')).toBeInTheDocument()
    expect(screen.queryByText(/No hay citas|No hay pacientes/)).not.toBeInTheDocument()
  })

  it('starts the confirmed assistant consultation only on the authorized route', () => {
    renderRouter('authenticated', '/usuarios', undefined, authenticatedUser('doctora'))

    expect(screen.getByRole('heading', { name: 'Usuarios' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
    expect(screen.queryByRole('heading', { name: 'Crear cuenta de asistente' })).not.toBeInTheDocument()
  })

  it('consults patients and offers creation after the backend contract is aligned', async () => {
    renderRouter('authenticated', '/pacientes', undefined, authenticatedUser('asistente'))

    expect(await screen.findByText('No hay pacientes registrados.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar paciente' })).toBeEnabled()
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

  it('keeps Tab and Shift+Tab inside the visible mobile drawer', () => {
    renderRouter('authenticated')
    const trigger = screen.getByRole('button', { name: 'Abrir menú' })
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Menú de navegación' })
    vi.spyOn(dialog, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList)
    const backdrop = within(dialog).getByRole('button', { name: 'Cerrar navegación' })
    const first = within(dialog).getByRole('button', { name: 'Cerrar menú' })
    const last = within(dialog).getByRole('button', { name: 'Cerrar sesión' })
    expect(first).toHaveFocus()
    expect(backdrop).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
    expect(backdrop).not.toHaveFocus()
    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(first).toHaveFocus()
    expect(backdrop).not.toHaveFocus()
    fireEvent.click(backdrop)
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it.each([
    ['doctora', true, true, 'Doctora'],
    ['asistente', false, true, 'Asistente'],
  ] as const)('shows confirmed navigation and real identity for %s', (role, seesUsers, seesPatients, label) => {
    renderRouter('authenticated', '/', undefined, authenticatedUser(role))

    const navigation = within(screen.getByRole('navigation', { name: 'Navegación principal' }))
    expect(Boolean(navigation.queryByRole('link', { name: 'Usuarios' }))).toBe(seesUsers)
    expect(Boolean(navigation.queryByRole('link', { name: 'Pacientes' }))).toBe(seesPatients)
    expect(navigation.queryByRole('link', { name: 'Mi perfil' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Registrar paciente' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('link', { name: 'Abrir pacientes' })).toHaveLength(seesPatients ? 1 : 0)
    expect(Boolean(navigation.queryByRole('link', { name: 'Agenda' }))).toBe(role === 'doctora')
    expect(navigation.getByRole('link', { name: 'Actividades' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver estado de Agenda' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ayuda' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByText('Nombre de sesión')).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByText(label)).toBeInTheDocument()
  })

  it.each([
    ['doctora', '/usuarios', true],
    ['doctora', '/pacientes', true],
    ['doctora', '/agenda', true],
    ['asistente', '/agenda', false],
    ['doctora', '/actividades', true],
    ['asistente', '/actividades', true],
    ['asistente', '/usuarios', false],
    ['asistente', '/pacientes', true],
    ['doctora', '/pacientes/patient-id/resumen', true],
    ['asistente', '/pacientes/patient-id/historial', true],
  ] as const)('applies confirmed access for %s at %s', (role, route, permitted) => {
    renderRouter('authenticated', route, undefined, authenticatedUser(role))

    if (permitted) {
      if (route.startsWith('/pacientes/')) expect(screen.getByRole('status')).toHaveTextContent('Cargando')
      else expect(screen.getByRole('heading', { name: route === '/usuarios' ? 'Usuarios' : route === '/agenda' ? 'Agenda' : route === '/actividades' ? 'Actividades' : 'Pacientes' })).toBeInTheDocument()
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
