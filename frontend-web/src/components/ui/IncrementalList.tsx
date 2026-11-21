import { useState, type ReactNode } from 'react'

const PAGE_SIZE = 50

// All records are already received and validated; only the DOM grows on demand.
export function IncrementalList<T>({ items, renderItem, className = '' }: { items: T[]; renderItem: (item: T) => ReactNode; className?: string }) {
  const [view, setView] = useState({ items, limit: PAGE_SIZE })
  const limit = view.items === items ? view.limit : PAGE_SIZE
  const visible = items.slice(0, limit)
  return <>
    <ul className={className}>{visible.map(renderItem)}</ul>
    {visible.length < items.length ? <div className="mt-4 flex flex-wrap items-center gap-3"><button className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold" onClick={() => setView({ items, limit: limit + PAGE_SIZE })} type="button">Mostrar más registros</button><span className="admin-muted text-sm">Mostrando {visible.length} de {items.length} registros recibidos</span></div> : null}
  </>
}
