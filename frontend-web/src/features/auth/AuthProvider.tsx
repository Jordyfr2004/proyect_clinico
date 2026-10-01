import { isAxiosError } from 'axios'
import { useEffect, useState, type ReactNode } from 'react'
import { AUTH_UNAUTHORIZED_EVENT } from '../../services/apiClient'
import { getCurrentUser, login as requestLogin, logout as requestLogout, registerPatient as requestRegisterPatient } from './authService'
import { clearAccessToken, getAccessToken, setAccessToken } from './authStorage'
import { AuthContext, type AuthStatus } from './authContext'
import type { LoginValues } from './loginSchema'
import type { RegisterPatientValues } from './registerPatientSchema'
import type { AuthUser } from './authService'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => getAccessToken() ? 'loading' : 'guest')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const token = getAccessToken()
    if (!token) return

    void getCurrentUser().then((currentUser) => {
      if (!active || getAccessToken() !== token) return
      setUser(currentUser)
      setStatus('authenticated')
    }).catch((error: unknown) => {
      if (!active || getAccessToken() !== token) return
      clearAccessToken()
      setUser(null)
      setStatus('guest')
      if (!isAxiosError(error) || error.response?.status !== 401) {
        setSessionError('No fue posible verificar la sesión con el servidor. Inicia sesión de nuevo.')
      }
    })

    return () => { active = false }
  }, [])

  useEffect(() => {
    const onUnauthorized = () => {
      clearAccessToken()
      setUser(null)
      setStatus('guest')
      setSessionError('Tu sesión expiró. Inicia sesión nuevamente.')
    }
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const login = async (values: LoginValues) => {
    const response = await requestLogin(values)
    acceptSession(response)
  }

  const acceptSession = (response: { access_token: string; user: AuthUser }) => {
    setAccessToken(response.access_token)
    setUser(response.user)
    setSessionError(null)
    setStatus('authenticated')
  }

  const registerPatient = async (values: RegisterPatientValues) => {
    const response = await requestRegisterPatient(values)
    acceptSession(response)
  }

  const logout = async () => {
    try {
      await requestLogout()
    } catch {
      // Local sign-out also applies when the server is unavailable.
    } finally {
      clearAccessToken()
      setUser(null)
      setSessionError(null)
      setStatus('guest')
    }
  }

  return <AuthContext.Provider value={{ status, user, sessionError, login, registerPatient, logout }}>{children}</AuthContext.Provider>
}
