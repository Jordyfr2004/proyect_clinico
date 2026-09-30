import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AUTH_FORBIDDEN_EVENT } from '../services/apiClient'
import { useAuth } from '../features/auth/authContext'
import { canAccessArea, type RestrictedArea } from '../features/auth/roleAccess'
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { ModulePage } from '../features/modules/ModulePage'
import { PatientSection, PatientWorkspace } from '../features/patients/PatientWorkspace'
import { AppLayout } from '../layouts/AppLayout'
import { PublicLayout } from '../layouts/PublicLayout'

function LoadingSession() {
  return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Verificando sesión…</div>
}

function RestrictedRoute({ area }: { area: RestrictedArea }) {
  const { user } = useAuth()
  if (canAccessArea(user?.role, area)) return <Outlet/>

  return <section aria-labelledby="access-denied-title" className="rounded-xl border border-slate-200 bg-white p-6">
    <h1 className="text-2xl font-semibold text-ink-950" id="access-denied-title">Acceso no autorizado</h1>
    <p className="mt-2 text-slate-600">No tienes permiso para acceder a esta sección.</p>
    <Link className="mt-4 inline-flex rounded-lg text-sm font-semibold text-clinic-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" to="/">Volver al Dashboard</Link>
  </section>
}

function ProtectedArea() {
  const { status: authStatus } = useAuth()
  const [forbidden, setForbidden] = useState(false)
  useEffect(() => {
    if (authStatus !== 'authenticated') return
    const onForbidden = () => setForbidden(true)
    window.addEventListener(AUTH_FORBIDDEN_EVENT, onForbidden)
    return () => window.removeEventListener(AUTH_FORBIDDEN_EVENT, onForbidden)
  }, [authStatus])
  if (authStatus === 'loading') return <LoadingSession/>
  if (authStatus !== 'authenticated') return <Navigate replace to="/login"/>
  return <>{forbidden ? <div role="alert" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950"><h2 className="font-semibold">Acceso no autorizado</h2><p>No tienes permiso para completar esta operación.</p><button className="mt-2 rounded border border-amber-700 px-3 py-1" onClick={() => setForbidden(false)} type="button">Cerrar aviso</button></div> : null}<AppLayout/></>
}

export function AppRouter() {
  const { status: authStatus } = useAuth()

  return (
    <Routes>
      <Route element={<PublicLayout/>}>
        <Route element={authStatus === 'loading' ? <LoadingSession/> : authStatus === 'authenticated' ? <Navigate replace to="/"/> : <LoginPage/>} path="/login"/>
        <Route element={authStatus === 'loading' ? <LoadingSession/> : authStatus === 'authenticated' ? <Navigate replace to="/"/> : <RegisterPage/>} path="/registro"/>
        <Route element={<ForgotPasswordPage/>} path="/recuperar-contrasena"/>
      </Route>
      <Route element={<ProtectedArea/>}>
        <Route element={<DashboardPage/>} index/>
        <Route element={<ModulePage module="agenda"/>} path="agenda"/>
        <Route element={<RestrictedRoute area="pacientes"/>}>
          <Route element={<ModulePage module="pacientes"/>} path="pacientes"/>
          <Route element={<PatientWorkspace/>} path="pacientes/:patientId">
            <Route element={<Navigate replace to="resumen"/>} index/>
            <Route element={<PatientSection title="Resumen"/>} path="resumen"/>
            <Route element={<PatientSection title="Historial clínico"/>} path="historial"/>
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
          <Route element={<ModulePage module="usuarios"/>} path="usuarios"/>
        </Route>
        <Route element={<ModulePage module="configuracion"/>} path="configuracion"/>
      </Route>
      <Route element={authStatus === 'loading' ? <LoadingSession/> : <Navigate replace to={authStatus === 'authenticated' ? '/' : '/login'}/>} path="*"/>
    </Routes>
  )
}
