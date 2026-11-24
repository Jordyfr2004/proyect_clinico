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
import { ApiError, NetworkError } from '@/api/errors';
import { cleanupSession } from './session-cleanup';

import { getCurrentUser, login, logoutRemote, registerPatient, verifyEmail as verifyEmailRemote } from './service';
import { clearAccessToken, loadAccessToken, saveAccessToken } from './session-storage';
import type { AuthSession, PatientUser, RegisterPatientInput } from './types';

export type AuthStatus = 'restoring' | 'anonymous' | 'authenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: PatientUser | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (input: RegisterPatientInput) => Promise<string>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  restoreError: string;
  retryRestore: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [user, setUser] = useState<PatientUser | null>(null);
  const tokenRef = useRef<string | null>(null);
  const generation = useRef(0);
  const storageQueue = useRef(Promise.resolve());
  const [restoreError, setRestoreError] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const retryRestore = useCallback(() => { setRestoreError(''); setRestoreAttempt(value => value + 1); }, []);
  const store = useCallback((operation: () => Promise<void>) => {
    const pending = storageQueue.current.catch(() => undefined).then(operation);
    storageQueue.current = pending;
    return pending;
  }, []);

  const clearSession = useCallback(async () => {
    generation.current += 1;
    tokenRef.current = null;
    setRestoreError('');
    setUser(null);
    setStatus('anonymous');
    try {
      await Promise.all([store(clearAccessToken), cleanupSession()]);
    } catch {
      // Memory access is revoked even if the platform keystore is temporarily unavailable.
    }
  }, [store]);

  useEffect(() => {
    let active = true;
    const operation = ++generation.current;

    setAccessTokenProvider(() => tokenRef.current);
    setUnauthorizedHandler(() => clearSession());

    void (async () => {
      try {
        const token = await loadAccessToken();
        if (!active || generation.current !== operation) return;
        if (!token) {
          await cleanupSession();
          if (!active || generation.current !== operation) return;
          setStatus('anonymous');
          return;
        }

        tokenRef.current = token;
        const currentUser = await getCurrentUser();
        if (!active || generation.current !== operation) return;
        setUser(currentUser);
        setStatus('authenticated');
      } catch (reason) {
        if (!active || generation.current !== operation) return;
        if (reason instanceof NetworkError || (reason instanceof ApiError && (reason.status >= 500 || reason.status === 429))) {
          setRestoreError(reason.message);
          return;
        }
        await clearSession();
      }
    })();

    return () => {
      active = false;
      generation.current += 1;
    };
  }, [clearSession, restoreAttempt, store]);

  const acceptSession = useCallback(async (session: AuthSession, operation: number) => {
    if (generation.current !== operation) return;
    await cleanupSession();
    if (generation.current !== operation) return;
    await store(() => saveAccessToken(session.accessToken));
    if (generation.current !== operation) return;
    tokenRef.current = session.accessToken;
    setUser(session.user);
    setStatus('authenticated');
  }, [store]);

  const signIn = useCallback(async (username: string, password: string) => {
    const operation = ++generation.current;
    await acceptSession(await login(username, password), operation);
  }, [acceptSession]);

  const signUp = useCallback(async (input: RegisterPatientInput) => {
    return registerPatient(input);
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const operation = ++generation.current;
    await acceptSession(await verifyEmailRemote(email, code), operation);
  }, [acceptSession]);

  const signOut = useCallback(async () => {
    const remote = tokenRef.current ? logoutRemote().catch(() => undefined) : Promise.resolve();
    await clearSession();
    try {
      await remote;
    } catch {
      // A remote failure must never leave a local bearer token active.
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ status, user, signIn, signUp, verifyEmail, signOut, restoreError, retryRestore }),
    [status, user, signIn, signUp, verifyEmail, signOut, restoreError, retryRestore],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider no está disponible.');
  return value;
};
