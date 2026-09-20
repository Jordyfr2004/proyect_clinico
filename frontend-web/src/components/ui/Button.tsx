import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' }
const variants = {
  primary: 'bg-clinic-600 text-white shadow-sm hover:bg-clinic-700 disabled:bg-slate-300',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:border-clinic-500 hover:text-clinic-700 disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 disabled:text-slate-400',
}

export function Button({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  return <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`} {...props}>{children}</button>
}
