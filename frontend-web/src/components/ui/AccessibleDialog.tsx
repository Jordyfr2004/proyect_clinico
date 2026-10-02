import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function AccessibleDialog({ title, titleId, onClose, children, busy = false }: { title: string; titleId: string; onClose: () => void; children: ReactNode; busy?: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const busyRef = useRef(busy)
  useEffect(() => { onCloseRef.current = onClose; busyRef.current = busy }, [onClose, busy])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const first = panelRef.current?.querySelector<HTMLElement>('[data-dialog-initial]') ?? panelRef.current?.querySelector<HTMLElement>('button')
    first?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); onCloseRef.current() }
      if (event.key !== 'Tab' || !panelRef.current) return
      const controls = [...panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')]
        .filter((control) => control.tabIndex >= 0 && control.getClientRects().length > 0)
      const firstControl = controls[0]
      const lastControl = controls[controls.length - 1]
      if (!firstControl || !lastControl) return
      if (event.shiftKey && document.activeElement === firstControl) { event.preventDefault(); lastControl.focus() }
      else if (!event.shiftKey && document.activeElement === lastControl) { event.preventDefault(); firstControl.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown) }
  }, [])

  return createPortal(
    <div className="admin-shell admin-dialog-layer fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5">
      <button aria-label={`Cerrar ${title}`} className="admin-dialog-backdrop absolute inset-0" disabled={busy} onClick={onClose} tabIndex={-1} type="button"/>
      <div aria-labelledby={titleId} aria-modal="true" className="admin-dialog-panel admin-surface-raised relative flex max-h-[100dvh] w-full max-w-[670px] flex-col overflow-hidden rounded-t-[22px] sm:max-h-[min(90dvh,850px)] sm:rounded-[22px]" ref={panelRef} role="dialog">
        <div className="flex shrink-0 items-center justify-between border-b border-[#dbe6f2] bg-[#f6faff] px-6 py-5 sm:px-8"><h2 className="text-xl font-bold tracking-tight text-ink-950" id={titleId}>{title}</h2><button aria-label="Cerrar diálogo" className="grid size-10 place-items-center rounded-[10px] text-[#526a87] hover:bg-[#e3f1ff] focus-visible:outline-2 focus-visible:outline-offset-2" disabled={busy} onClick={onClose} type="button"><X aria-hidden="true" size={20}/></button></div>
        <div className="min-h-0 overflow-y-auto p-6 sm:p-8">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
