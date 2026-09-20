import { Navigate, Route, Routes } from 'react-router-dom'
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage'
import { LoginPage } from '../features/auth/LoginPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { ModulePage } from '../features/modules/ModulePage'
import { PatientSection, PatientWorkspace } from '../features/patients/PatientWorkspace'
import { AppLayout } from '../layouts/AppLayout'
import { PublicLayout } from '../layouts/PublicLayout'

export type AuthStatus = 'authenticated' | 'guest' | 'loading'

function ProtectedArea({ authStatus }: { authStatus: AuthStatus }) {
  if (authStatus === 'loading') return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Verificando sesión…</div>
  return authStatus === 'authenticated' ? <AppLayout/> : <Navigate replace to="/login"/>
}

export function AppRouter({ authStatus }: { authStatus: AuthStatus }) {
  return <Routes><Route element={<PublicLayout/>}><Route element={authStatus === 'authenticated' ? <Navigate replace to="/"/> : <LoginPage/>} path="/login"/><Route element={<ForgotPasswordPage/>} path="/recuperar-contrasena"/></Route><Route element={<ProtectedArea authStatus={authStatus}/> }><Route element={<DashboardPage/>} index/><Route element={<ModulePage module="agenda"/>} path="agenda"/><Route element={<ModulePage module="pacientes"/>} path="pacientes"/><Route element={<PatientWorkspace/>} path="pacientes/:patientId"><Route element={<Navigate replace to="resumen"/>} index/><Route element={<PatientSection title="Resumen"/>} path="resumen"/><Route element={<PatientSection title="Historial clínico"/>} path="historial"/><Route element={<PatientSection title="Diagnósticos"/>} path="diagnosticos"/><Route element={<PatientSection title="Tratamientos"/>} path="tratamientos"/><Route element={<PatientSection title="Odontograma"/>} path="odontograma"/><Route element={<PatientSection title="Radiografías y documentos"/>} path="radiografias"/><Route element={<PatientSection title="Recetas"/>} path="recetas"/><Route element={<PatientSection title="Planes y presupuestos"/>} path="planes"/></Route><Route element={<ModulePage module="inventario"/>} path="inventario"/><Route element={<ModulePage module="reportes"/>} path="reportes"/><Route element={<ModulePage module="usuarios"/>} path="usuarios"/><Route element={<ModulePage module="configuracion"/>} path="configuracion"/></Route><Route element={<Navigate replace to={authStatus === 'authenticated' ? '/' : '/login'}/>} path="*"/></Routes>
}
