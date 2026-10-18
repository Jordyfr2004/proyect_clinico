import { useCallback, useEffect, useRef, useState } from 'react';

type ReloadResult<T> = { ok: true; data: T } | { ok: false };

const errorMessage = (reason: unknown) =>
  reason instanceof Error ? reason.message : 'No se pudo cargar la información.';

export function useRemote<T>(loader: () => Promise<T>) {
  const [snapshot, setSnapshot] = useState<{
    scope: typeof loader;
    data: T | null;
    loading: boolean;
    error: string;
  }>({ scope: loader, data: null, loading: true, error: '' });
  const mountedRef = useRef(false);
  const latestRequestRef = useRef(0);
  const refreshRef = useRef<Promise<ReloadResult<T>> | null>(null);
  const current =
    snapshot.scope === loader
      ? snapshot
      : { scope: loader, data: null, loading: true, error: '' };

  const execute = useCallback(async (): Promise<ReloadResult<T>> => {
    const requestId = ++latestRequestRef.current;
    if (mountedRef.current) {
      setSnapshot((previous) => ({
        scope: loader,
        data: previous.scope === loader ? previous.data : null,
        loading: true,
        error: '',
      }));
    }
    try {
      const value = await loader();
      if (mountedRef.current && requestId === latestRequestRef.current) {
        setSnapshot({ scope: loader, data: value, loading: false, error: '' });
      }
      return { ok: true as const, data: value };
    } catch (reason) {
      if (mountedRef.current && requestId === latestRequestRef.current) {
        setSnapshot((previous) => ({
          scope: loader,
          data: previous.scope === loader ? previous.data : null,
          loading: false,
          error: errorMessage(reason),
        }));
      }
      return { ok: false as const };
    }
  }, [loader]);

  const reload = useCallback((): Promise<ReloadResult<T>> => {
    if (refreshRef.current) return refreshRef.current;
    const promise = execute();
    refreshRef.current = promise;
    void promise.finally(() => {
      if (refreshRef.current === promise) refreshRef.current = null;
    });
    return promise;
  }, [execute]);

  useEffect(() => {
    mountedRef.current = true;
    latestRequestRef.current += 1;
    refreshRef.current = null;
    void execute();
    return () => {
      mountedRef.current = false;
      latestRequestRef.current += 1;
      refreshRef.current = null;
    };
  }, [execute]);

  return {
    data: current.data,
    loading: current.loading,
    error: current.error,
    reload,
  };
}
