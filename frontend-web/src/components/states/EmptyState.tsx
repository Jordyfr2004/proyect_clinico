import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = { icon: LucideIcon; title: string; description: string }

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return <div className="admin-state admin-surface flex min-h-56 flex-col items-center justify-center rounded-[20px] px-6 py-11 text-center"><span className="admin-module-icon mb-5 size-14 rounded-[16px]"><Icon aria-hidden="true" size={26}/></span><p className="text-base font-semibold text-ink-950">{title}</p><p className="admin-muted mt-2 max-w-lg text-sm leading-6">{description}</p></div>
}
