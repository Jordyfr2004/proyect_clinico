export function LoadingState({ label = 'Cargando información…' }: { label?: string }) {
  return <p className="admin-muted py-4 text-sm" role="status">{label}</p>
}
