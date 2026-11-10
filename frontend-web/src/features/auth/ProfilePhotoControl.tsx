import { isAxiosError } from 'axios'
import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import { ProtectedPhoto } from './ProtectedPhoto'
import { useAuth } from './authContext'
import { deleteProfilePhoto, uploadProfilePhoto } from './profilePhotoService'
import { removeClinicalQueries } from '../../services/clinicalQuery'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const roleLabels = { doctora: 'Doctora', asistente: 'Asistente', paciente: 'Paciente' }

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible comunicarse con el servidor.'
    const message = (error.response.data as { message?: unknown } | undefined)?.message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'No fue posible actualizar la foto de perfil.'
}

export function ProfilePhotoControl({ initialPhotoUrl, onBusyChange }: { initialPhotoUrl?: string | null; onBusyChange?: (busy: boolean) => void }) {
  const { user } = useAuth()
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl ?? null)
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const pending = useRef(false)
  const handleLoadError = useCallback(() => setLoadError(true), [])

  if (!user) return null
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toLocaleUpperCase('es')).join('')

  const setPending = (value: boolean) => {
    pending.current = value
    setBusy(value)
    onBusyChange?.(value)
  }
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || pending.current) return
    if (!allowedTypes.has(file.type) || file.size > 5 * 1024 * 1024) { setError('Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.'); return }
    setPending(true); setError(null)
    try {
      const next = await uploadProfilePhoto(file)
      removeClinicalQueries(['photo', user.id])
      setPhotoUrl(next)
      setRevision((value) => value + 1)
      setLoadError(false)
      window.dispatchEvent(new CustomEvent('clinic:profile-photo-changed', { detail: next }))
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setPending(false) }
  }
  const remove = async () => {
    if (pending.current) return
    setPending(true); setError(null)
    try {
      const next = await deleteProfilePhoto()
      removeClinicalQueries(['photo', user.id])
      setPhotoUrl(next)
      setConfirmDelete(false)
      setLoadError(false)
      window.dispatchEvent(new CustomEvent('clinic:profile-photo-changed', { detail: next }))
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setPending(false) }
  }

  return <div className="text-center">
    <ProtectedPhoto className="mx-auto size-36 rounded-full text-4xl font-semibold sm:size-44" fallbackText={initials} key={`${user.id}-${revision}`} name={user.name} onLoadError={handleLoadError} photoUrl={photoUrl}/>
    <p className="mt-3 truncate text-base font-semibold text-ink-950" title={user.name}>{user.name}</p>
    <p className="mt-0.5 text-sm text-slate-500">{roleLabels[user.role]}</p>
    {loadError && photoUrl ? <p className="mt-3 text-sm text-amber-800" role="status">No fue posible mostrar la foto guardada. Puedes intentarlo de nuevo más tarde.</p> : null}
    {error ? <p className="mt-3 text-sm text-red-700" role="alert">{error}</p> : null}
    <div className="mt-5 flex flex-wrap justify-center gap-2">
      <label className="admin-primary inline-flex min-h-11 cursor-pointer items-center rounded-lg px-4 text-sm font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-clinic-600">{busy ? 'Guardando…' : 'Seleccionar foto'}<input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(event) => { void upload(event) }} type="file"/></label>
      {photoUrl && !confirmDelete ? <button className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={() => setConfirmDelete(true)} type="button">Eliminar foto</button> : null}
    </div>
    {confirmDelete ? <div className="mt-4 rounded-lg border border-[#dbe6f2] p-3 text-left">
      <p className="text-sm text-ink-950">¿Eliminar tu foto de perfil?</p>
      <div className="mt-3 flex gap-2"><button className="admin-primary min-h-11 rounded-lg px-3 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={() => { void remove() }} type="button">{busy ? 'Eliminando…' : 'Confirmar eliminación'}</button><button className="admin-secondary min-h-11 rounded-lg px-3 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={() => setConfirmDelete(false)} type="button">Cancelar</button></div>
    </div> : null}
  </div>
}
