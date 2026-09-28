import { Navigate, NavLink, Outlet, useParams } from 'react-router-dom'
import { IntegrationPending } from '../../components/states/IntegrationPending'

const sections = [['resumen', 'Resumen'], ['historial', 'Historial'], ['diagnosticos', 'Diagnósticos'], ['tratamientos', 'Tratamientos'], ['odontograma', 'Odontograma'], ['radiografias', 'Radiografías'], ['recetas', 'Recetas'], ['planes', 'Planes / presupuestos']]

export function PatientWorkspace() {
  const { patientId } = useParams()
  if (!patientId) return <Navigate replace to="/pacientes"/>
  return <div><div className="border-b border-slate-200 pb-5"><p className="text-sm font-medium text-clinic-700">Expediente clínico</p><h1 className="mt-2 text-2xl font-bold text-ink-950">Paciente sin información disponible</h1><p className="mt-2 text-sm text-slate-500">Identificador: {patientId}</p></div><nav aria-label="Secciones del expediente" className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">{sections.map(([path, label]) => <NavLink className={({ isActive }) => `shrink-0 border-b-2 px-3 py-3 text-sm font-medium ${isActive ? 'border-clinic-600 text-clinic-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`} key={path} to={path}>{label}</NavLink>)}</nav><div className="mt-6"><Outlet/></div></div>
}

export function PatientSection({ title }: { title: string }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-semibold text-ink-950">{title}</h2><div className="mt-5"><IntegrationPending detail={title === 'Odontograma' ? 'El odontograma se habilitará cuando pueda verificarse la numeración y estructura clínica definida por la base de datos.' : `La información de ${title.toLowerCase()} se cargará desde los servicios reales del backend.`}/></div></section>
}
