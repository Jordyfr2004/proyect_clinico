import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppRouter } from './AppRouter'
import { AUTH_FORBIDDEN_EVENT } from '../services/apiClient'
import { AuthContext, type AuthStatus } from '../features/auth/authContext'
import type { LoginValues } from '../features/auth/loginSchema'
import type { AuthUser, UserRole } from '../features/auth/authService'
import { getPatient } from '../features/patients/patientService'
import { getClinicalHistoryByPatient } from '../features/clinical-history/clinicalHistoryService'
import { getPatientEvidence } from '../features/evidence/evidenceService'
import { deleteProfilePhoto, getProfilePhoto, uploadProfilePhoto } from '../features/auth/profilePhotoService'

vi.mock('../features/assistant/assistantService', () => ({
  getAssistants: vi.fn(() => new Promise(() => {})),
}))
vi.mock('../features/assistant/patientAccountsService', () => ({ getPatientAccounts: vi.fn(() => Promise.resolve([])) }))
vi.mock('../features/patients/patientService', () => ({
  getPatients: vi.fn(() => Promise.resolve({ data: [], current_page: 1, last_page: 1, per_page: 20, total: 0, next_page_url: null, prev_page_url: null })),
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
vi.mock('../features/evidence/evidenceService', () => ({ getPatientEvidence: vi.fn(() => Promise.resolve([])) }))
vi.mock('../features/cash/cashService', () => ({ getCashSummary: vi.fn(() => Promise.resolve({ periodo: 'mes', ingresos: '0.00', egresos: '0.00', saldo: '0.00' })), getExpenses: vi.fn(() => Promise.resolve([])) }))
vi.mock('../features/audit/auditService', () => ({ getRecordedActions: vi.fn(() => Promise.resolve([])), getRecordedSessions: vi.fn(() => Promise.resolve([])) }))
vi.mock('../features/auth/profilePhotoService', () => ({ getProfilePhoto: vi.fn(), uploadProfilePhoto: vi.fn(), deleteProfilePhoto: vi.fn() }))

function renderRouter(status: AuthStatus, path = '/', login: (values: LoginValues) => Promise<void> = async () => {}, user: AuthUser | null = authenticatedUser('doctora')) {
  const logout = vi.fn(async () => {})
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={{ status, user, sessionError: null, login, logout }}>
        <AppRouter/>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return { logout }
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
  it('allows the assistant to consult patient evidence without write actions', async () => {
    vi.mocked(getPatient).mockResolvedValueOnce({ id: 'patient-id', codigo_paciente: '001', nombres: 'Nombre recibido', cedula: '0912345678', telefono: null, direccion: null, fecha_nacimiento: null })
    renderRouter('authenticated', '/pacientes/patient-id/radiografias', undefined, authenticatedUser('asistente'))
    expect(await screen.findByRole('heading', { name: 'Evidencias clínicas' })).toBeInTheDocument()
    expect(getPatientEvidence).toHaveBeenCalledWith('patient-id')
    expect(screen.queryByRole('button', { name: /Subir|Eliminar evidencia/ })).not.toBeInTheDocument()
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

  it.each(['/', '/agenda', '/citas-medicas', '/actividades', '/caja', '/reportes', '/configuracion', '/usuarios', '/pacientes', '/pacientes/patient-id/historial', '/mi-perfil', '/registro'])('blocks the patient before mounting the administrative shell at %s', (path) => {
    renderRouter('authenticated', path, undefined, authenticatedUser('paciente'))
    expect(screen.getByRole('heading', { name: 'Este portal está disponible para el personal de la clínica.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled()
    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('offers the confirmed password recovery flow', () => {
    renderRouter('guest', '/recuperar-contrasena')

    expect(screen.getByRole('heading', { name: 'Recupera tu acceso' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Correo electrónico' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Solicitar código' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Volver al inicio de sesión' }))
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument()
  })

  it('redirects authenticated users away from password recovery', async () => {
    renderRouter('authenticated', '/recuperar-contrasena', undefined, authenticatedUser('doctora'))

    expect(await screen.findByRole('heading', { name: 'Resumen de gestión' })).toBeInTheDocument()
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

  it('shows the backend rate-limit message for login HTTP 429', async () => {
    const login = vi.fn().mockRejectedValue({ isAxiosError: true, response: { status: 429, data: { message: 'Demasiados intentos.' } } })
    renderRouter('guest', '/login', login)
    fireEvent.change(screen.getByLabelText('Usuario o cédula'), { target: { value: 'doctora' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'valid-password-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos.')
  })

  it('shows the real dashboard sections without claiming there are no records before loading', async () => {
    renderRouter('authenticated')

    expect(await screen.findByRole('heading', { name: 'Resumen de gestión' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Agenda de hoy' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Accesos rápidos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Solicitudes pendientes' })).toBeInTheDocument()
  })

  it.each(['doctora', 'asistente'] as const)('offers Citas médicas from the dashboard only to %s when authorized', async (role) => {
    renderRouter('authenticated', '/', undefined, authenticatedUser(role))
    await screen.findByRole('heading', { name: 'Accesos rápidos' })
    const main = within(screen.getByRole('main'))
    if (role === 'doctora') {
      expect(main.getByRole('link', { name: /Ver agenda completa/ })).toHaveAttribute('href', '/agenda')
      expect(main.getByRole('link', { name: /Citas médicasConsulta y gestión/ })).toHaveAttribute('href', '/citas-medicas')
    } else {
      expect(main.queryByRole('link', { name: /Ver agenda completa/ })).not.toBeInTheDocument()
      expect(main.queryByRole('link', { name: /Citas médicasConsulta y gestión/ })).not.toBeInTheDocument()
    }
  })

  it('starts the confirmed assistant consultation only on the authorized route', async () => {
    renderRouter('authenticated', '/usuarios', undefined, authenticatedUser('doctora'))

    expect(await screen.findByRole('heading', { name: 'Usuarios' })).toBeInTheDocument()
    expect(screen.getAllByRole('status').some((status) => status.textContent?.includes('Cargando'))).toBe(true)
    expect(screen.queryByRole('heading', { name: 'Crear cuenta de asistente' })).not.toBeInTheDocument()
  })

  it('consults patients and offers creation after the backend contract is aligned', async () => {
    renderRouter('authenticated', '/pacientes', undefined, authenticatedUser('asistente'))

    expect(await screen.findByText('No hay pacientes registrados.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar paciente' })).toBeEnabled()
  })

  it('shows a dismissible notice after a forbidden response without blocking the current page', async () => {
    renderRouter('authenticated')

    act(() => window.dispatchEvent(new Event(AUTH_FORBIDDEN_EVENT)))

    expect(screen.getByRole('heading', { name: 'Acceso no autorizado' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Resumen de gestión' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    expect(screen.queryByRole('heading', { name: 'Acceso no autorizado' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resumen de gestión' })).toBeInTheDocument()
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
    const last = within(dialog).getByRole('button', { name: 'Abrir menú de usuario' })
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

  it('opens the centered photo dialog and restores focus with Escape, X and Volver', () => {
    renderRouter('authenticated')
    const trigger = screen.getByRole('button', { name: 'Abrir menú de perfil' })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const panel = screen.getByRole('dialog', { name: 'Fotografía de perfil' })
    expect(panel).toHaveAttribute('aria-modal', 'true')
    expect(panel).toHaveClass('max-w-[420px]')
    expect(within(panel).getByText('Nombre de sesión')).toBeInTheDocument()
    expect(within(panel).getByText('Doctora')).toBeInTheDocument()
    expect(within(panel).getByLabelText('Seleccionar foto')).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Volver' })).toBeInTheDocument()
    expect(within(panel).queryByText('Mi perfil')).not.toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Cerrar' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Fotografía de perfil' })).getByRole('button', { name: 'Volver' }))
    expect(trigger).toHaveFocus()
    fireEvent.click(trigger)
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Fotografía de perfil' })).getByRole('button', { name: 'Cerrar' }))
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens the sidebar user menu, enters photo controls, and signs out from the menu', async () => {
    const { logout } = renderRouter('authenticated')
    const sidebar = screen.getByRole('navigation', { name: 'Navegación principal' }).closest('aside') as HTMLElement
    const trigger = within(sidebar).getByRole('button', { name: 'Abrir menú de usuario' })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const menu = within(sidebar).getByRole('menu', { name: 'Opciones de usuario' })
    expect(within(menu).getByRole('menuitem', { name: 'Mi perfil / Cambiar fotografía' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(trigger).toHaveFocus()
    fireEvent.click(trigger)
    fireEvent.pointerDown(document.body)
    expect(within(sidebar).queryByRole('menu', { name: 'Opciones de usuario' })).not.toBeInTheDocument()
    fireEvent.click(trigger)
    fireEvent.click(within(sidebar).getByRole('menuitem', { name: 'Mi perfil / Cambiar fotografía' }))
    expect(screen.getByRole('dialog', { name: 'Fotografía de perfil' })).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Fotografía de perfil' })).getByRole('button', { name: 'Volver' }))
    expect(trigger).toHaveFocus()
    fireEvent.click(trigger)
    fireEvent.click(within(sidebar).getByRole('menuitem', { name: 'Cerrar sesión' }))
    await waitFor(() => expect(logout).toHaveBeenCalledOnce())
  })

  it('keeps the mobile drawer open when the user menu handles Escape', () => {
    renderRouter('authenticated')
    const drawerTrigger = screen.getByRole('button', { name: 'Abrir menú' })
    fireEvent.click(drawerTrigger)
    const drawer = screen.getByRole('dialog', { name: 'Menú de navegación' })
    const userTrigger = within(drawer).getByRole('button', { name: 'Abrir menú de usuario' })
    fireEvent.click(userTrigger)
    expect(within(drawer).getByRole('menu', { name: 'Opciones de usuario' })).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(within(drawer).queryByRole('menu', { name: 'Opciones de usuario' })).not.toBeInTheDocument()
    expect(drawerTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(userTrigger).toHaveFocus()
  })

  it('synchronizes the large photo and header avatar after upload and confirmed deletion', async () => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:profile-photo') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.mocked(uploadProfilePhoto).mockResolvedValue('/api/usuarios/user-id/foto')
    vi.mocked(getProfilePhoto).mockResolvedValue(new Blob(['photo'], { type: 'image/png' }))
    vi.mocked(deleteProfilePhoto).mockResolvedValue(null)
    renderRouter('authenticated')
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de perfil' }))
    const panel = screen.getByRole('dialog', { name: 'Fotografía de perfil' })
    fireEvent.change(within(panel).getByLabelText('Seleccionar foto'), { target: { files: [new File(['photo'], 'perfil.png', { type: 'image/png' })] } })
    await waitFor(() => expect(document.querySelectorAll('img[src="blob:profile-photo"]')).toHaveLength(3))
    fireEvent.click(within(panel).getByRole('button', { name: 'Eliminar foto' }))
    fireEvent.click(within(panel).getByRole('button', { name: 'Confirmar eliminación' }))
    await waitFor(() => expect(document.querySelectorAll('img[src="blob:profile-photo"]')).toHaveLength(0))
    expect(within(panel).queryByRole('button', { name: 'Eliminar foto' })).not.toBeInTheDocument()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('traps keyboard focus and prevents closing the photo dialog during an upload', async () => {
    let finishUpload!: (url: string) => void
    vi.mocked(uploadProfilePhoto).mockImplementation(() => new Promise((resolve) => { finishUpload = resolve }))
    vi.mocked(getProfilePhoto).mockResolvedValue(new Blob(['photo'], { type: 'image/png' }))
    renderRouter('authenticated')
    const trigger = screen.getByRole('button', { name: 'Abrir menú de perfil' })
    fireEvent.click(trigger)
    const panel = screen.getByRole('dialog', { name: 'Fotografía de perfil' })
    const close = within(panel).getByRole('button', { name: 'Cerrar' })
    const back = within(panel).getByRole('button', { name: 'Volver' })
    vi.spyOn(close, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList)
    vi.spyOn(back, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(back).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(close).toHaveFocus()
    fireEvent.change(within(panel).getByLabelText('Seleccionar foto'), { target: { files: [new File(['photo'], 'perfil.png', { type: 'image/png' })] } })
    expect(close).toBeDisabled()
    expect(back).toBeDisabled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(panel).toBeInTheDocument()
    await act(async () => { finishUpload('/api/usuarios/user-id/foto') })
    expect(close).toBeEnabled()
    fireEvent.click(back)
    expect(trigger).toHaveFocus()
  })

  it('returns old profile links to the dashboard instead of mounting a separate page', async () => {
    renderRouter('authenticated', '/mi-perfil')
    expect(await screen.findByRole('heading', { name: 'Resumen de gestión' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mi perfil' })).not.toBeInTheDocument()
  })

  it('collapses the desktop sidebar and expands it temporarily on hover and focus', () => {
    renderRouter('authenticated')
    const aside = screen.getByRole('navigation', { name: 'Navegación principal' }).closest('aside') as HTMLElement
    const collapse = screen.getByRole('button', { name: 'Contraer menú lateral' })
    expect(collapse).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(collapse)
    expect(screen.getByRole('button', { name: 'Expandir menú lateral' })).toHaveAttribute('aria-expanded', 'false')
    expect(aside).toHaveClass('w-[72px]')
    const patients = within(aside).getByRole('link', { name: 'Pacientes' })
    expect(patients).toHaveAttribute('title', 'Pacientes')
    expect(patients).toHaveAttribute('aria-label', 'Pacientes')
    expect(within(aside).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
    fireEvent.mouseEnter(aside)
    fireEvent.mouseMove(aside)
    expect(aside).not.toHaveClass('w-[72px]')
    fireEvent.mouseLeave(aside)
    expect(aside).toHaveClass('w-[72px]')
    fireEvent.focus(patients)
    expect(aside).not.toHaveClass('w-[72px]')
    fireEvent.blur(patients, { relatedTarget: document.body })
    expect(aside).toHaveClass('w-[72px]')
    fireEvent.click(screen.getByRole('button', { name: 'Expandir menú lateral' }))
    expect(screen.getByRole('button', { name: 'Contraer menú lateral' })).toHaveAttribute('aria-expanded', 'true')
  })

  it.each([
    ['doctora', true, true, 'Doctora'],
    ['asistente', false, true, 'Asistente'],
  ] as const)('shows confirmed navigation and real identity for %s', async (role, seesUsers, seesPatients, label) => {
    renderRouter('authenticated', '/', undefined, authenticatedUser(role))

    const navigation = within(screen.getByRole('navigation', { name: 'Navegación principal' }))
    expect(Boolean(navigation.queryByRole('link', { name: 'Usuarios' }))).toBe(seesUsers)
    expect(Boolean(navigation.queryByRole('link', { name: 'Pacientes' }))).toBe(seesPatients)
    expect(navigation.queryByRole('link', { name: 'Mi perfil' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Registrar paciente' })).not.toBeInTheDocument()
    await screen.findByRole('heading', { name: 'Resumen de gestión' })
    expect(screen.queryAllByRole('link', { name: /PacientesListado y registro/ })).toHaveLength(seesPatients ? 1 : 0)
    expect(Boolean(navigation.queryByRole('link', { name: 'Agenda' }))).toBe(role === 'doctora')
    expect(Boolean(navigation.queryByRole('link', { name: 'Citas médicas' }))).toBe(role === 'doctora')
    expect(Boolean(navigation.queryByRole('link', { name: 'Caja' }))).toBe(role === 'doctora')
    expect(Boolean(navigation.queryByRole('link', { name: 'Configuración' }))).toBe(role === 'doctora')
    expect(Boolean(navigation.queryByRole('link', { name: 'Reportes' }))).toBe(role === 'doctora')
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
    ['doctora', '/citas-medicas', true],
    ['asistente', '/citas-medicas', false],
    ['doctora', '/actividades', true],
    ['asistente', '/actividades', true],
    ['doctora', '/caja', true],
    ['asistente', '/caja', false],
    ['doctora', '/configuracion', true],
    ['asistente', '/configuracion', false],
    ['doctora', '/reportes', true],
    ['asistente', '/reportes', false],
    ['doctora', '/servicios', true],
    ['asistente', '/servicios', false],
    ['asistente', '/usuarios', false],
    ['asistente', '/pacientes', true],
    ['doctora', '/pacientes/patient-id/resumen', true],
    ['asistente', '/pacientes/patient-id/historial', true],
  ] as const)('applies confirmed access for %s at %s', async (role, route, permitted) => {
    renderRouter('authenticated', route, undefined, authenticatedUser(role))

    if (permitted) {
      if (route.startsWith('/pacientes/')) expect(screen.getByRole('status')).toHaveTextContent('Cargando')
      else expect(await screen.findByRole('heading', { name: route === '/usuarios' ? 'Usuarios' : route === '/agenda' ? 'Agenda' : route === '/citas-medicas' ? 'Citas médicas' : route === '/actividades' ? 'Actividades' : route === '/caja' ? 'Caja' : route === '/configuracion' ? 'Configuración' : route === '/reportes' ? 'Reportes' : route === '/servicios' ? 'Servicios del consultorio' : 'Pacientes' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Acceso no autorizado' })).not.toBeInTheDocument()
    } else {
      expect(screen.getByRole('heading', { name: 'Acceso no autorizado' })).toBeInTheDocument()
      const back = screen.getByRole('link', { name: 'Volver al Dashboard' })
      expect(back).toHaveAttribute('href', '/')
      fireEvent.click(back)
      expect(await screen.findByRole('heading', { name: 'Resumen de gestión' })).toBeInTheDocument()
    }
  })

})
