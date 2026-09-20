import { ShieldCheck, Stethoscope } from 'lucide-react'
import { Outlet } from 'react-router-dom'

export function PublicLayout() {
  return <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(340px,0.8fr)_1.2fr]"><section className="hidden bg-ink-950 p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-clinic-500"><Stethoscope/></span><div><p className="font-bold">Clínica Dental</p><p className="text-sm text-blue-200">Gestión clínica</p></div></div><div className="max-w-lg"><p className="text-4xl font-semibold leading-tight">La práctica clínica, organizada con claridad.</p><p className="mt-5 leading-7 text-blue-100">Acceso profesional para la doctora y el equipo asistencial.</p></div><div className="flex items-center gap-2 text-sm text-blue-200"><ShieldCheck size={18}/> Acceso protegido y preparado para Laravel Sanctum</div></section><section className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 sm:px-8"><Outlet/></section></main>
}
