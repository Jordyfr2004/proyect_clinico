import { QueryClient, useQuery, type QueryKey } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

// Clinical responses stay in memory only. A new session always gets a new key space.
let sessionGeneration = 0
let sessionIdentity = 'guest'

export const clinicalQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 60_000,
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 20_000,
    },
  },
})

function scopedKey(key: QueryKey): QueryKey {
  return ['clinical', sessionGeneration, sessionIdentity, ...key]
}

export function useClinicalQuery<T>(key: QueryKey, read: (signal: AbortSignal) => Promise<T>, options?: { enabled?: boolean; staleTime?: number }) {
  const query = useQuery<T, Error>({
    queryKey: scopedKey(key),
    queryFn: async ({ signal }) => {
      // StrictMode can unmount the first observer in the same turn. Avoid starting that HTTP request.
      await Promise.resolve()
      signal.throwIfAborted()
      return read(signal)
    },
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
    ...(options?.staleTime !== undefined ? { staleTime: options.staleTime } : {}),
  }, clinicalQueryClient)
  const accessRevoked = isAxiosError(query.error) && [401, 403].includes(query.error.response?.status ?? 0)
  // TanStack can retain previous data after a failed refetch; never expose it after 401/403.
  return { ...query, data: accessRevoked ? undefined : query.data }
}

export function invalidateClinicalQueries(key: QueryKey): Promise<void> {
  return clinicalQueryClient.invalidateQueries({ queryKey: scopedKey(key) })
}

export function markClinicalQueriesStale(key: QueryKey): Promise<void> {
  return clinicalQueryClient.invalidateQueries({ queryKey: scopedKey(key), refetchType: 'none' })
}

export function removeClinicalQueries(key: QueryKey): void {
  clinicalQueryClient.removeQueries({ queryKey: scopedKey(key) })
}

export function clearClinicalQueries(): void {
  sessionGeneration++
  sessionIdentity = 'guest'
  clinicalQueryClient.clear()
}

export function beginClinicalSession(user: { id: string; role: string }): void {
  clearClinicalQueries()
  sessionIdentity = `${user.role}:${user.id}`
}
