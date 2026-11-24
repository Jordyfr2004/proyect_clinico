import { History } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { useClinicalQuery } from '../../services/clinicalQuery'
import { formatDateTime } from '../../utils/displayFormat'
import { requestError } from '../../utils/requestError'
import { useAuth } from '../auth/authContext'
import { getChangeHistory, type ChangeFilters, type RecordedChange } from './changeHistoryService'

const operations = { INSERT: 'Creación', UPDATE: 'Actualización', DELETE: 'Eliminación' }
const fields = [['tabla', 'Tabla'], ['registro_id', 'ID del registro'], ['usuario_id', 'UUID del usuario'], ['fecha', 'Fecha']] as const

export function ChangeHistorySection() {
  const { user } = useAuth()
  const [draft, setDraft] = useState<Record<keyof Required<ChangeFilters>, string>>({ tabla: '', registro_id: '', usuario_id: '', fecha: '' })
  const [filters, setFilters] = useState<ChangeFilters>({})
  const [detail, setDetail] = useState<RecordedChange | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const query = useClinicalQuery(['audit', 'changes', filters], (signal) => getChangeHistory(filters, signal), { enabled: user?.role === 'doctora' })
  if (user?.role !== 'doctora') return <p role="alert">Acceso exclusivo de doctora.</p>
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFilters(Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value)))
  }
  const close = () => { setDetail(null); trigger.current?.focus() }
  return <section aria-labelledby="change-history-title" className="admin-reveal space-y-5">
    <div><p className="admin-kicker">Registro y seguimiento</p><h2 className="mt-2 text-xl font-semibold text-ink-950" id="change-history-title">Historial de cambios</h2><p className="admin-body mt-2">Consulta los últimos cambios registrados por Laravel, hasta 200 resultados por consulta. Los filtros se aplican en el servidor.</p></div>
    <form aria-label="Filtros del historial de cambios" className="admin-surface grid items-end gap-3 rounded-[20px] p-5 sm:grid-cols-2 xl:grid-cols-5" onSubmit={apply}>
      {fields.map(([key, label]) => <label className="min-w-0 text-sm font-medium text-ink-950" key={key}>{label}<input className="admin-input mt-2 w-full text-sm" maxLength={key === 'tabla' || key === 'registro_id' ? 100 : undefined} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} pattern={key === 'usuario_id' ? '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' : undefined} type={key === 'fecha' ? 'date' : 'text'} value={draft[key]}/></label>)}
      <button className="admin-primary min-h-11 rounded-lg px-4 text-sm font-semibold" type="submit">Aplicar filtros</button>
    </form>
    {query.isError ? <ErrorState description={requestError(query.error, 'No fue posible cargar el historial de cambios.')} onRetry={() => { void query.refetch() }}/>
      : !query.data ? <LoadingState/>
        : query.data.length === 0 ? <EmptyState description="No se recibieron cambios para los filtros seleccionados." icon={History} title="Sin cambios registrados"/>
          : <div className="admin-surface overflow-hidden rounded-[20px]"><ul aria-label="Cambios registrados" className="max-h-[65vh] divide-y divide-[#e6edf6] overflow-y-auto">
            {query.data.map((record) => <li className="flex flex-wrap items-center justify-between gap-4 p-5" key={record.id}>
              <div className="min-w-0 flex-1"><p className="break-words font-semibold text-ink-950">{operations[record.operacion]} · {record.tabla}</p><p className="admin-muted mt-1 text-sm">{formatDateTime(record.fecha)} · {record.usuario ?? 'Usuario no disponible'} · {record.rol ?? 'Rol no disponible'}</p><p className="admin-meta mt-1 break-all text-xs">Registro: {record.registro_id ?? 'No disponible'}</p></div>
              <button aria-label={`Ver cambio ${record.id}`} className="admin-secondary min-h-11 rounded-lg px-4 text-sm font-semibold" onClick={(event) => { trigger.current = event.currentTarget; setDetail(record) }} type="button">Ver detalles</button>
            </li>)}
          </ul><p className="admin-meta border-t border-[#e6edf6] px-5 py-3 text-xs">{query.data.length} registros recibidos · Máximo 200. Ajusta los filtros para consultar otro registro.</p></div>}
    {detail ? <AccessibleDialog onClose={close} title="Detalle del cambio" titleId="change-detail-title">
      <p className="admin-body break-all text-sm">{operations[detail.operacion]} · {detail.esquema}.{detail.tabla} · {detail.registro_id ?? 'Registro no disponible'}</p>
      {detail.campos_modificados.length ? <p className="admin-muted mt-2 break-words text-xs">Campos modificados: {detail.campos_modificados.join(', ')}</p> : null}
      <div className="mt-5 grid gap-4 md:grid-cols-2">{([['Valores anteriores', detail.datos_anteriores, 'Sin valores anteriores'], ['Valores nuevos', detail.datos_nuevos, 'Sin valores posteriores']] as const).map(([label, value, empty]) => <section className="min-w-0" key={label}><h3 className="text-sm font-semibold text-ink-950">{label}</h3>{value === null ? <p className="admin-muted mt-2 rounded-xl bg-slate-50 p-4 text-sm">{empty}</p> : <pre className="mt-2 max-h-[45vh] overflow-auto whitespace-pre-wrap break-all rounded-xl border border-[#e6edf6] bg-slate-50 p-4 text-xs leading-6">{JSON.stringify(value, null, 2)}</pre>}</section>)}</div>
      <p className="admin-meta mt-4 text-xs">Las credenciales y los tokens se muestran como [oculto].</p>
    </AccessibleDialog> : null}
  </section>
}
