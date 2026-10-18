import { useCallback, useEffect, useState } from 'react';

export function useRemote<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const value = await loader();
      setData(value);
      return { ok: true as const, data: value };
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar la información.');
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    let active = true;
    loader()
      .then(
        (value) => { if (active) setData(value); },
        (reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'No se pudo cargar la información.'); },
      )
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loader]);

  return { data, loading, error, reload };
}
