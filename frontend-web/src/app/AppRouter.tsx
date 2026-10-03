import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AUTH_FORBIDDEN_EVENT } from '../services/apiClient'
import { useAuth } from '../features/auth/authContext'
import { canAccessArea, isStaffRole, type RestrictedArea } from '../features/auth/roleAccess'
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage'
import { LoginPage } from '../features/auth/LoginPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { UsersPage } from '../features/assistant/UsersPage'
import { ModulePage } from '../features/modules/ModulePage'
import { PatientSection, PatientWorkspace } from '../features/patients/PatientWorkspace'
import { PatientsPage } from '../features/patients/PatientsPage'
import { ClinicalHistorySection } from '../features/clinical-history/ClinicalHistorySection'
import { AgendaPage } from '../features/agenda/AgendaPage'
import { ActivitiesPage } from '../features/activities/ActivitiesPage'
import { AppLayout } from '../layouts/AppLayout'
import { PublicLayout } from '../layouts/PublicLayout'

function LoadingSession() {
  return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Verificando sesión…</div>
}

function RestrictedRoute({ area }: { area: RestrictedArea }) {
  const { user } = useAuth()
  if (canAccessArea(user?.role, area)) return <Outlet/>

  return <section aria-labelledby="access-denied-title" className="admin-state admin-surface max-w-2xl rounded-[20px] p-7 sm:p-10">
    <span aria-hidden="true" className="admin-module-icon mb-6 size-14 rounded-[16px]"><LockKeyhole size={26}/></span>
    <p className="admin-kicker">Acceso restringido</p><h1 className="mt-2 text-2xl font-semibold text-ink-950" id="access-denied-title">Acceso no autorizado</h1>
    <p className="admin-body mt-2">No tienes permiso para acceder a esta sección.</p>
    <Link className="admin-secondary admin-interactive mt-6 inline-flex min-h-11 items-center rounded-[10px] px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" to="/">Volver al Dashboard</Link>
  </section>
}

function ProtectedArea() {
  const { status: authStatus, user, logout } = useAuth()
  const [forbidden, setForbidden] = useState(false)
  const [logoutPending, setLogoutPending] = useState(false)
  useEffect(() => {
    if (authStatus !== 'authenticated') return
    const onForbidden = () => setForbidden(true)
    window.addEventListener(AUTH_FORBIDDEN_EVENT, onForbidden)
    return () => window.removeEventListener(AUTH_FORBIDDEN_EVENT, onForbidden)
  }, [authStatus])
  if (authStatus === 'loading') return <LoadingSession/>
  if (authStatus !== 'authenticated') return <Navigate replace to="/login"/>
  if (!isStaffRole(user?.role)) return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <section className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6" aria-labelledby="staff-only-title">
        <h1 className="text-xl font-semibold text-ink-950" id="staff-only-title">Este portal está disponible para el personal de la clínica.</h1>
        <button className="mt-6 min-h-11 rounded-lg bg-clinic-700 px-4 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600 disabled:opacity-60" disabled={logoutPending} onClick={() => { setLogoutPending(true); void logout().finally(() => setLogoutPending(false)) }} type="button">{logoutPending ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
      </section>
    </main>
  )
  return <>
    {forbidden ? (
      <div className="admin-state border-b border-[#b9d7f4] bg-[#eaf5ff] px-4 py-4 text-[#174b83] sm:px-7" role="alert">
        <div className="mx-auto flex max-w-[1450px] flex-wrap items-center gap-x-5 gap-y-2"><div className="flex-1"><h2 className="font-semibold">Acceso no autorizado</h2><p className="mt-1 text-sm leading-6">No tienes permiso para completar esta operación.</p></div><button className="min-h-11 rounded-[10px] border border-[#83b7eb] px-4 text-sm font-semibold hover:bg-[#dceeff] focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => setForbidden(false)} type="button">Cerrar aviso</button></div>
      </div>
    ) : null}
    <AppLayout/>
  </>
}

export function AppRouter() {
  const { status: authStatus } = useAuth()

  return (
    <Routes>
      <Route element={<PublicLayout/>}>
        <Route element={authStatus === 'loading' ? <LoadingSession/> : authStatus === 'authenticated' ? <Navigate replace to="/"/> : <LoginPage/>} path="/login"/>
        <Route element={authStatus === 'loading' ? <LoadingSession/> : authStatus === 'authenticated' ? <Navigate replace to="/"/> : <ForgotPasswordPage/>} path="/recuperar-contrasena"/>
      </Route>
      <Route element={<ProtectedArea/>}>
        <Route element={<DashboardPage/>} index/>
        <Route element={<RestrictedRoute area="agenda"/>}>
          <Route element={<AgendaPage/>} path="agenda"/>
        </Route>
        <Route element={<RestrictedRoute area="actividades"/>}>
          <Route element={<ActivitiesPage/>} path="actividades"/>
        </Route>
        <Route element={<RestrictedRoute area="pacientes"/>}>
          <Route element={<PatientsPage/>} path="pacientes"/>
          <Route element={<PatientWorkspace/>} path="pacientes/:patientId">
            <Route element={<Navigate replace to="resumen"/>} index/>
            <Route element={<PatientSection title="Resumen"/>} path="resumen"/>
            <Route element={<ClinicalHistorySection/>} path="historial"/>
            <Route element={<PatientSection title="Diagnósticos"/>} path="diagnosticos"/>
            <Route element={<PatientSection title="Tratamientos"/>} path="tratamientos"/>
            <Route element={<PatientSection title="Odontograma"/>} path="odontograma"/>
            <Route element={<PatientSection title="Radiografías y documentos"/>} path="radiografias"/>
            <Route element={<PatientSection title="Recetas"/>} path="recetas"/>
            <Route element={<PatientSection title="Planes y presupuestos"/>} path="planes"/>
          </Route>
        </Route>
        <Route element={<ModulePage module="reportes"/>} path="reportes"/>
        <Route element={<RestrictedRoute area="usuarios"/>}>
          <Route element={<UsersPage/>} path="usuarios"/>
        </Route>
        <Route element={<ModulePage module="configuracion"/>} path="configuracion"/>
      </Route>
      <Route element={authStatus === 'loading' ? <LoadingSession/> : <Navigate replace to={authStatus === 'authenticated' ? '/' : '/login'}/>} path="*"/>
    </Routes>
  )
}
