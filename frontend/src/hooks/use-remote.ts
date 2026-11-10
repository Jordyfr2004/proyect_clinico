import { useCallback, useEffect, useState } from 'react';

export function useRemote<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await loader());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar la información.');
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
