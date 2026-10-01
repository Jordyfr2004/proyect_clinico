import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = { icon: LucideIcon; title: string; description: string }

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center"><span className="mb-4 grid size-12 place-items-center rounded-xl bg-clinic-50 text-clinic-700"><Icon aria-hidden="true" size={24}/></span><p className="text-base font-semibold text-ink-950">{title}</p><p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">{description}</p></div>
}
