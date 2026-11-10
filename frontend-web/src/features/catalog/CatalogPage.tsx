import { isAxiosError } from 'axios'
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { IncrementalList } from '../../components/ui/IncrementalList'
import { formatCurrency } from '../../utils/displayFormat'
import { createCategory, createService, deleteService, getCategories, getServices, setCategoryActive, setServiceActive, updateCategory, updateService, type ConsultingService, type ServiceValues } from './catalogService'
import { Layers3 } from 'lucide-react'
import { markClinicalQueriesStale, useClinicalQuery } from '../../services/clinicalQuery'

type ServiceForm = { categoria_id: string; nombre: string; descripcion: string; imagen: string; precio: string; duracion_minutos: string }
const emptyForm: ServiceForm = { categoria_id: '', nombre: '', descripcion: '', imagen: '', precio: '', duracion_minutos: '' }

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible comunicarse con el servidor.'
    if ([403, 404, 409, 422].includes(error.response.status)) {
      const message = (error.response.data as { message?: unknown } | undefined)?.message
      if (typeof message === 'string' && message.trim()) return message
    }
  }
  return 'No fue posible completar la operación.'
}

export function CatalogPage() {
  const [categoryName, setCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyForm)
  const [editingService, setEditingService] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ConsultingService | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const pending = useRef(false)
  const deleteTrigger = useRef<HTMLButtonElement | null>(null)

  const categoriesQuery = useClinicalQuery(['catalog', 'categories'], getCategories)
  const servicesQuery = useClinicalQuery(['catalog', 'services'], getServices)
  const load = async (scope: 'all' | 'services' = 'all'): Promise<boolean> => {
    await markClinicalQueriesStale(scope === 'all' ? ['catalog'] : ['catalog', 'services'])
    if (scope === 'services') return (await servicesQuery.refetch()).isSuccess
    const [categories, services] = await Promise.all([categoriesQuery.refetch(), servicesQuery.refetch()])
    return categories.isSuccess && services.isSuccess
  }

  const mutate = async (request: () => Promise<unknown>, message: string, after?: () => void, scope: 'all' | 'services' = 'all') => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await request()
      after?.()
      if (await load(scope)) setSuccess(message)
      else setError('El cambio se confirmó, pero no fue posible actualizar el catálogo.')
    } catch (cause) {
      setError(errorMessage(cause))
      if (isAxiosError(cause) && [404, 409].includes(cause.response?.status ?? 0)) await load(scope)
    } finally { pending.current = false; setBusy(false) }
  }

  const submitCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nombre = categoryName.trim()
    if (!nombre) return
    void mutate(
      () => editingCategory ? updateCategory(editingCategory, nombre) : createCategory(nombre),
      editingCategory ? 'Categoría actualizada.' : 'Categoría creada.',
      () => { setCategoryName(''); setEditingCategory(null) },
    )
  }
  const submitService = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values: ServiceValues = {
      categoria_id: serviceForm.categoria_id,
      nombre: serviceForm.nombre.trim(),
      descripcion: serviceForm.descripcion.trim(),
      imagen: serviceForm.imagen.trim() || null,
      precio: serviceForm.precio.trim() ? Number(serviceForm.precio) : null,
      duracion_minutos: serviceForm.duracion_minutos.trim() ? Number(serviceForm.duracion_minutos) : null,
    }
    if (!values.categoria_id || !values.nombre || !values.descripcion) return
    void mutate(
      () => editingService ? updateService(editingService, values) : createService(values),
      editingService ? 'Servicio actualizado.' : 'Servicio creado.',
      () => { setServiceForm(emptyForm); setEditingService(null) },
      'services',
    )
  }
  const editService = (service: ConsultingService) => {
    setEditingService(service.id)
    setServiceForm({
      categoria_id: service.categoria_id, nombre: service.nombre, descripcion: service.descripcion,
      imagen: service.imagen ?? '', precio: service.precio ?? '',
      duracion_minutos: service.duracion_minutos?.toString() ?? '',
    })
    document.getElementById('service-name')?.focus()
  }
  const updateForm = (field: keyof ServiceForm, value: string) => setServiceForm((current) => ({ ...current, [field]: value }))
  const activeCategories = categoriesQuery.data?.filter(({ activo }) => activo) ?? []
  const selectedInactiveCategory = categoriesQuery.data && editingService
    ? categoriesQuery.data.find(({ id, activo }) => id === serviceForm.categoria_id && !activo)
    : undefined

  return <div className="admin-reveal max-w-[1200px] space-y-6">
    <header><p className="admin-kicker">Administración</p><h1 className="admin-page-title mt-2">Servicios del consultorio</h1><p className="admin-body mt-2">Gestiona las categorías y los servicios registrados.</p><Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-clinic-700 underline" to="/configuracion">Volver a Configuración</Link></header>
    {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p> : null}
    {success ? <p className="admin-success rounded-lg p-4 text-sm" role="status">{success}</p> : null}
    {categoriesQuery.data ? <>
      <section aria-labelledby="catalog-categories-title" className="admin-surface rounded-[20px] p-5 sm:p-7"><h2 className="text-xl font-semibold text-ink-950" id="catalog-categories-title">Categorías</h2>
        <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={submitCategory}><div className="min-w-[220px] flex-1"><label className="block text-sm font-medium text-ink-950" htmlFor="category-name">Nombre de la categoría</label><input className="admin-input mt-2 w-full" id="category-name" maxLength={255} onChange={(event) => setCategoryName(event.target.value)} required type="text" value={categoryName}/></div><button className="admin-primary min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-60" disabled={busy} type="submit">{editingCategory ? 'Guardar cambios' : 'Crear categoría'}</button>{editingCategory ? <button className="admin-secondary min-h-11 rounded-lg px-4 text-sm" onClick={() => { setEditingCategory(null); setCategoryName('') }} type="button">Cancelar edición</button> : null}</form>
        {categoriesQuery.data.length ? <IncrementalList className="mt-5 divide-y divide-[#e4ecf6]" items={categoriesQuery.data} renderItem={(category) => <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={category.id}><div><p className="font-semibold text-ink-950">{category.nombre}</p><span className={`admin-pill mt-1 inline-block ${category.activo ? 'admin-pill-ready' : 'admin-pill-pending'}`}>{category.activo ? 'Activa' : 'Inactiva'}</span></div><div className="flex flex-wrap gap-2"><button className="admin-secondary min-h-11 rounded-lg px-3 text-sm disabled:opacity-60" disabled={busy} onClick={() => { setEditingCategory(category.id); setCategoryName(category.nombre); document.getElementById('category-name')?.focus() }} type="button">Editar</button><button className="admin-secondary min-h-11 rounded-lg px-3 text-sm disabled:opacity-60" disabled={busy} onClick={() => { void mutate(() => setCategoryActive(category.id, !category.activo), 'Estado de categoría actualizado.') }} type="button">{category.activo ? 'Desactivar' : 'Activar'}</button></div></li>}/> : <div className="mt-5"><EmptyState description="No se han registrado categorías." icon={Layers3} title="Sin categorías"/></div>}
      </section>
    </> : categoriesQuery.isError ? <ErrorState description={errorMessage(categoriesQuery.error)} onRetry={() => { void categoriesQuery.refetch() }}/> : <LoadingState/>}
    {servicesQuery.data ? <>
      <section aria-labelledby="catalog-services-title" className="admin-surface rounded-[20px] p-5 sm:p-7"><h2 className="text-xl font-semibold text-ink-950" id="catalog-services-title">Servicios</h2>
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submitService}>
          <div><label className="block text-sm font-medium" htmlFor="service-category">Categoría</label><select className="admin-input mt-2 w-full" id="service-category" onChange={(event) => updateForm('categoria_id', event.target.value)} required value={serviceForm.categoria_id}><option value="">Selecciona una categoría</option>{selectedInactiveCategory ? <option value={selectedInactiveCategory.id}>{selectedInactiveCategory.nombre} (inactiva)</option> : null}{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></div>
          <div><label className="block text-sm font-medium" htmlFor="service-name">Nombre</label><input className="admin-input mt-2 w-full" id="service-name" maxLength={255} onChange={(event) => updateForm('nombre', event.target.value)} required type="text" value={serviceForm.nombre}/></div>
          <div className="sm:col-span-2"><label className="block text-sm font-medium" htmlFor="service-description">Descripción</label><textarea className="admin-input mt-2 w-full" id="service-description" onChange={(event) => updateForm('descripcion', event.target.value)} required rows={3} value={serviceForm.descripcion}/></div>
          <div><label className="block text-sm font-medium" htmlFor="service-image">Referencia de imagen (opcional)</label><input className="admin-input mt-2 w-full" id="service-image" maxLength={500} onChange={(event) => updateForm('imagen', event.target.value)} type="text" value={serviceForm.imagen}/></div>
          <div><label className="block text-sm font-medium" htmlFor="service-price">Precio (opcional)</label><input className="admin-input mt-2 w-full" id="service-price" min={0} onChange={(event) => updateForm('precio', event.target.value)} step="0.01" type="number" value={serviceForm.precio}/></div>
          <div><label className="block text-sm font-medium" htmlFor="service-duration">Duración en minutos (opcional)</label><input className="admin-input mt-2 w-full" id="service-duration" min={1} onChange={(event) => updateForm('duracion_minutos', event.target.value)} step={1} type="number" value={serviceForm.duracion_minutos}/></div>
          <div className="flex flex-wrap items-end gap-2"><button className="admin-primary min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-60" disabled={busy || (!activeCategories.length && !editingService)} type="submit">{editingService ? 'Guardar servicio' : 'Crear servicio'}</button>{editingService ? <button className="admin-secondary min-h-11 rounded-lg px-4 text-sm" onClick={() => { setEditingService(null); setServiceForm(emptyForm) }} type="button">Cancelar edición</button> : null}</div>
        </form>
        {servicesQuery.data.length ? <IncrementalList className="mt-7 grid gap-3" items={servicesQuery.data} renderItem={(service) => <li className="rounded-xl border border-[#e0e9f4] p-4" key={service.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-ink-950">{service.nombre}</h3><p className="admin-muted mt-1 text-sm">{service.categoria?.nombre ?? 'Categoría no disponible'} · {service.descripcion}</p><p className="admin-muted mt-2 text-sm">{service.precio !== null ? formatCurrency(service.precio) : 'Precio no registrado'}{service.duracion_minutos !== null ? ` · ${service.duracion_minutos} min` : ''}</p></div><span className={`admin-pill ${service.activo ? 'admin-pill-ready' : 'admin-pill-pending'}`}>{service.activo ? 'Activo' : 'Inactivo'}</span></div><div className="mt-4 flex flex-wrap gap-2"><button className="admin-secondary min-h-11 rounded-lg px-3 text-sm disabled:opacity-60" disabled={busy} onClick={() => editService(service)} type="button">Editar</button><button className="admin-secondary min-h-11 rounded-lg px-3 text-sm disabled:opacity-60" disabled={busy} onClick={() => { void mutate(() => setServiceActive(service.id, !service.activo), 'Estado del servicio actualizado.', undefined, 'services') }} type="button">{service.activo ? 'Desactivar' : 'Activar'}</button><button className="min-h-11 rounded-lg border border-red-200 px-3 text-sm text-red-700 disabled:opacity-60" disabled={busy} onClick={(event) => { deleteTrigger.current = event.currentTarget; setConfirmDelete(service) }} type="button">Eliminar</button></div></li>}/> : <div className="mt-5"><EmptyState description="No se han registrado servicios." icon={Layers3} title="Sin servicios"/></div>}
      </section>
    </> : servicesQuery.isError ? <ErrorState description={errorMessage(servicesQuery.error)} onRetry={() => { void servicesQuery.refetch() }}/> : <LoadingState/>}
    {categoriesQuery.data && categoriesQuery.isError ? <p className="text-sm text-red-700" role="alert">No fue posible actualizar las categorías. <button className="dashboard-retry" onClick={() => { void categoriesQuery.refetch() }} type="button">Reintentar</button></p> : null}
    {servicesQuery.data && servicesQuery.isError ? <p className="text-sm text-red-700" role="alert">No fue posible actualizar los servicios. <button className="dashboard-retry" onClick={() => { void servicesQuery.refetch() }} type="button">Reintentar</button></p> : null}
    {confirmDelete ? <AccessibleDialog busy={busy} onClose={() => { if (!pending.current) { setConfirmDelete(null); deleteTrigger.current?.focus() } }} title="Eliminar servicio" titleId="delete-service-title"><p className="admin-body text-sm">¿Eliminar el servicio {confirmDelete.nombre}? Esta acción no se puede deshacer.</p><div className="mt-6 flex gap-3"><button className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-60" data-dialog-initial disabled={busy} onClick={() => { void mutate(() => deleteService(confirmDelete.id), 'Servicio eliminado.', () => { setConfirmDelete(null); deleteTrigger.current?.focus() }, 'services') }} type="button">Confirmar eliminación</button><button className="admin-secondary min-h-11 rounded-lg px-4 text-sm" disabled={busy} onClick={() => { setConfirmDelete(null); deleteTrigger.current?.focus() }} type="button">Cancelar</button></div></AccessibleDialog> : null}
  </div>
}
