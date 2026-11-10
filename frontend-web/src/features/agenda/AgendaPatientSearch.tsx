import { isAxiosError } from 'axios'
import { useEffect, useId, useRef, useState } from 'react'
import { useClinicalQuery } from '../../services/clinicalQuery'
import { getPatients, type Patient } from '../patients/patientService'

export function AgendaPatientSearch({ selected, onSelect, disabled }: { selected: Patient | null; onSelect: (patient: Patient | null) => void; disabled: boolean }) {
  const [text, setText] = useState('')
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(text.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [text])

  const query = useClinicalQuery(['agenda', 'patient-search', term], (signal) => getPatients({ buscar: term, page: 1 }, signal), { enabled: open && Boolean(term) && !disabled })
  const ready = open && term === text.trim() && Boolean(term)
  const patients = ready ? query.data?.data ?? [] : []
  useEffect(() => {
    if (!ready || !query.data?.data[active]) return
    const option = listRef.current?.children.item(active)
    if (option instanceof HTMLElement) option.scrollIntoView?.({ block: 'nearest' })
  }, [active, ready, query.data])
  const choose = (patient: Patient) => {
    onSelect(patient)
    setText(`${patient.nombres} (${patient.codigo_paciente})`)
    setOpen(false)
  }

  return <div className="relative sm:col-span-2">
    <label className="text-sm font-medium text-ink-950" htmlFor={`${listId}-input`}>Buscar paciente</label>
    <input
      aria-activedescendant={ready && patients[active] ? `${listId}-option-${active}` : undefined}
      aria-autocomplete="list"
      aria-controls={open && text.trim() ? listId : undefined}
      aria-expanded={open && Boolean(text.trim())}
      autoComplete="off"
      className="admin-input mt-1 w-full text-sm"
      data-dialog-initial
      disabled={disabled}
      id={`${listId}-input`}
      onChange={(event) => { setText(event.target.value); onSelect(null); setActive(0); setOpen(true) }}
      onFocus={() => { if (!selected && text.trim()) setOpen(true) }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false) }
        if (event.key === 'ArrowDown' && patients.length) { event.preventDefault(); setActive((index) => (index + 1) % patients.length) }
        if (event.key === 'ArrowUp' && patients.length) { event.preventDefault(); setActive((index) => (index - 1 + patients.length) % patients.length) }
        if (event.key === 'Enter' && open && patients.length) { event.preventDefault(); choose(patients[active] ?? patients[0]) }
      }}
      placeholder="Nombre o código del paciente"
      role="combobox"
      type="search"
      value={text}
    />
    {selected ? <p className="admin-muted mt-2 text-sm" role="status"><strong className="text-ink-950">Paciente seleccionado:</strong> {selected.nombres} · Código: {selected.codigo_paciente}</p> : null}
    {open && text.trim() ? <div className="admin-surface mt-1 w-full min-w-0 rounded-xl border border-[#dbe6f2] p-2 shadow-lg">
      {term !== text.trim() || !query.data && !query.isError ? <p className="admin-muted p-2 text-sm" role="status">Buscando pacientes…</p> : null}
      {ready && query.isError ? <p className="p-2 text-sm text-red-700" role="alert">{isAxiosError(query.error) && !query.error.response ? 'No fue posible comunicarse con el servidor.' : 'No fue posible buscar pacientes.'} <button className="dashboard-retry" onClick={() => { void query.refetch() }} type="button">Reintentar</button></p> : null}
      {ready && query.data && patients.length === 0 ? <p className="admin-muted p-2 text-sm">Sin coincidencias. Prueba otro nombre o código.</p> : null}
      <ul className="max-h-56 overflow-x-hidden overflow-y-auto overscroll-contain" id={listId} ref={listRef} role="listbox">
        {patients.map((patient, index) => <li aria-selected={index === active} className={`cursor-pointer rounded-lg p-2 text-left text-sm ${index === active ? 'bg-clinic-50' : 'hover:bg-sky-50'}`} id={`${listId}-option-${index}`} key={patient.id} onClick={() => choose(patient)} onMouseDown={(event) => event.preventDefault()} role="option"><strong className="block break-words text-ink-950">{patient.nombres}</strong><span className="admin-muted break-all">Código: {patient.codigo_paciente}</span></li>)}
      </ul>
      {ready && query.data && query.data.last_page > 1 ? <p className="admin-muted border-t border-[#dbe6f2] p-2 text-xs">Se muestra la primera página. Refina la búsqueda para encontrar otros pacientes.</p> : null}
    </div> : null}
  </div>
}
