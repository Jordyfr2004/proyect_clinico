import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = { icon: LucideIcon; title: string; description: string }

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center"><span className="mb-4 grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-500"><Icon aria-hidden="true" size={24}/></span><p className="font-semibold text-slate-800">{title}</p><p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p></div>
}
