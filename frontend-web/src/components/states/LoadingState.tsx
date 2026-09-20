export function LoadingState({ label = 'Cargando información…' }: { label?: string }) {
  return <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-slate-500" role="status"><span className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-clinic-600"/>{label}</div>
}
