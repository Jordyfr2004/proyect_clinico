import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { setAccessTokenProvider, setUnauthorizedHandler } from '@/api/client';

import { getCurrentUser, login, logoutRemote, registerPatient } from './service';
import { clearAccessToken, loadAccessToken, saveAccessToken } from './session-storage';
import type { AuthSession, PatientUser, RegisterPatientInput } from './types';

export type AuthStatus = 'restoring' | 'anonymous' | 'authenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: PatientUser | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (input: RegisterPatientInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [user, setUser] = useState<PatientUser | null>(null);
  const tokenRef = useRef<string | null>(null);

  const clearSession = useCallback(async () => {
    tokenRef.current = null;
    await clearAccessToken();
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    let active = true;

    setAccessTokenProvider(() => tokenRef.current);
    setUnauthorizedHandler(() => clearSession());

    void (async () => {
      try {
        const token = await loadAccessToken();
        if (!active) return;
        if (!token) {
          setStatus('anonymous');
          return;
        }

        tokenRef.current = token;
        const currentUser = await getCurrentUser();
        if (!active) return;
        setUser(currentUser);
        setStatus('authenticated');
      } catch {
        tokenRef.current = null;
        await clearAccessToken();
        if (active) {
          setUser(null);
          setStatus('anonymous');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [clearSession]);

  const acceptSession = useCallback(async (session: AuthSession) => {
    await saveAccessToken(session.accessToken);
    tokenRef.current = session.accessToken;
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    await acceptSession(await login(username, password));
  }, [acceptSession]);

  const signUp = useCallback(async (input: RegisterPatientInput) => {
    await acceptSession(await registerPatient(input));
  }, [acceptSession]);

  const signOut = useCallback(async () => {
    try {
      if (tokenRef.current) await logoutRemote();
    } catch {
      // A remote failure must never leave a local bearer token active.
    } finally {
      await clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ status, user, signIn, signUp, signOut }),
    [status, user, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider no está disponible.');
  return value;
};
