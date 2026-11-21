import type { InputHTMLAttributes } from 'react'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }

export function FormField({ id, label, error, className = '', ...props }: FormFieldProps) {
  return <label className="block text-sm font-medium text-slate-700" htmlFor={id}>{label}<input aria-describedby={error ? `${id}-error` : undefined} aria-invalid={Boolean(error)} className={`mt-2 block h-11 w-full rounded-lg border bg-white px-3 text-[15px] text-slate-950 shadow-sm transition placeholder:text-slate-400 ${error ? 'border-red-400' : 'border-slate-300 hover:border-slate-400 focus:border-clinic-500'} ${className}`} id={id} {...props}/>{error ? <span className="mt-1.5 block text-sm font-normal text-red-600" id={`${id}-error`}>{error}</span> : null}</label>
}
