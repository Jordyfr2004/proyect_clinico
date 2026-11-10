import { Stethoscope } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { LoginVisual } from '../features/auth/LoginVisual'
import '../features/auth/login.css'

export function PublicLayout() {
  const usesLoginLayout = useLocation().pathname === '/login'

  return (
    <main className={usesLoginLayout ? 'login-layout' : 'grid min-h-screen bg-white lg:grid-cols-[46%_54%]'}>
      {usesLoginLayout ? <LoginVisual/> : (
        <section className="relative hidden min-h-screen bg-ink-950 px-10 py-10 text-white lg:flex lg:flex-col xl:px-16 xl:py-14">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-clinic-500"><Stethoscope aria-hidden="true"/></span><div><p className="font-bold">Clínica Dental</p><p className="text-sm text-blue-200">Gestión clínica</p></div></div>
          <div className="my-auto max-w-lg py-16"><p className="text-4xl font-semibold leading-tight tracking-tight">La práctica clínica, organizada con claridad.</p><p className="mt-6 max-w-md leading-7 text-blue-100">Acceso profesional para la doctora y el equipo asistencial.</p></div>
          <div className="h-px w-24 bg-white/25" aria-hidden="true"/>
        </section>
      )}
      <section className={usesLoginLayout ? 'login-form-area' : 'flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 sm:px-8 lg:px-10'}>
        <Outlet/>
      </section>
    </main>
  )
}
