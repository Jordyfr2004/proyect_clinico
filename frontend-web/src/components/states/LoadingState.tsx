export function LoadingState({ label = 'Cargando información…' }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 px-4 text-center text-sm text-slate-600" role="status">
      <span aria-hidden="true" className="size-5 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-clinic-600 motion-reduce:animate-none"/>
      {label}
    </div>
  )
}
