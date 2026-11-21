import { useEffect, useRef, useState } from 'react'
import { getProfilePhoto } from './profilePhotoService'
import { useClinicalQuery } from '../../services/clinicalQuery'

function photoUserId(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const path = new URL(value, 'https://local.invalid').pathname
    const match = path.match(/\/usuarios\/([^/]+)\/foto\/?$/)
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

export function ProtectedPhoto({ photoUrl, name, className = '', fallbackText, onLoadError, deferUntilVisible = false }: { photoUrl?: string | null; name: string; className?: string; fallbackText?: string; onLoadError?: () => void; deferUntilVisible?: boolean }) {
  const userId = photoUserId(photoUrl)
  const element = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(() => !deferUntilVisible || typeof IntersectionObserver === 'undefined')
  const [photo, setPhoto] = useState<{ userId: string; blob: Blob; source: string } | null>(null)
  const query = useClinicalQuery(['photo', userId], (signal) => getProfilePhoto(userId!, signal), { enabled: Boolean(userId) && visible, staleTime: 60_000 })

  useEffect(() => {
    if (!deferUntilVisible || visible) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true) }, { rootMargin: '120px' })
    if (element.current) observer.observe(element.current)
    return () => observer.disconnect()
  }, [deferUntilVisible, visible])

  useEffect(() => {
    if (!userId || !query.data) return
    const blob = query.data
    let active = true
    let source: string | null = null
    void Promise.resolve().then(() => {
      if (!active) return
      source = URL.createObjectURL(blob)
      setPhoto({ userId, blob, source })
    })
    return () => { active = false; if (source) URL.revokeObjectURL(source) }
  }, [userId, query.data])
  useEffect(() => { if (query.isError) onLoadError?.() }, [query.isError, onLoadError])

  return <span aria-hidden="true" className={`admin-avatar grid shrink-0 place-items-center overflow-hidden ${className}`} ref={element}>
    {photo?.userId === userId && photo.blob === query.data ? <img alt="" className="size-full object-cover" src={photo.source}/> : fallbackText ?? name.trim().charAt(0).toLocaleUpperCase('es')}
  </span>
}
