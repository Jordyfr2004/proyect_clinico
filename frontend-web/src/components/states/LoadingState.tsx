export function LoadingState({ label = 'Cargando información…' }: { label?: string }) {
  return (
    <div className="admin-state admin-surface min-h-40 rounded-[20px] p-6 sm:p-8" role="status">
      <div aria-hidden="true" className="space-y-4">
        <div className="admin-skeleton h-3 w-24 rounded-full"/>
        <div className="admin-skeleton h-5 w-1/2 max-w-64 rounded-full"/>
        <div className="admin-skeleton h-3 w-3/4 max-w-lg rounded-full"/>
      </div>
      <p className="admin-muted mt-6 text-sm font-medium">{label}</p>
    </div>
  )
}
