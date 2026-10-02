import { createContext, useContext } from 'react'
import type { LoginValues } from './loginSchema'
import type { AuthUser } from './authService'

export type AuthStatus = 'loading' | 'authenticated' | 'guest'

type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  sessionError: string | null
  login: (values: LoginValues) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is required')
  return context
}
