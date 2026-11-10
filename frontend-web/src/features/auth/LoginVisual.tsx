import { ClipboardList, FileText, Scan } from 'lucide-react'

const clinicalAreas = [
  { icon: ClipboardList, title: 'Historial clínico', description: 'Información clínica centralizada por paciente.' },
  { icon: Scan, title: 'Odontograma y archivos', description: 'Acceso al odontograma, radiografías y documentos asociados.' },
  { icon: FileText, title: 'Tratamientos y evolución', description: 'Consulta de tratamientos y seguimiento clínico registrado.' },
]

function DentalOrbit() {
  return (
    <svg className="login-dental-orbit" viewBox="0 0 520 520" fill="none" aria-hidden="true">
      <circle className="login-orbit-ring-cover" cx="84" cy="95" r="9"/>
      <g className="login-orbit-arcs" stroke="currentColor" strokeWidth="1">
        <path d="M145 280a245 245 0 0 1 245-245"/>
        <path d="M145 280a245 245 0 0 0 109 205"/>
        <path d="M185 280a205 205 0 0 1 205-205"/>
        <path d="M185 280a205 205 0 0 0 92 171"/>
        <path d="M225 280a165 165 0 0 1 165-165"/>
      </g>
      <g className="login-orbit-guides" stroke="currentColor" strokeWidth="1">
        <path d="M170 120h25l30 20"/><path d="M170 210h25l30 15"/>
        <path d="M170 300h25l30-8"/><path d="M170 390h25l30-15"/>
      </g>
      <g className="login-orbit-nodes" fill="currentColor">
        <circle cx="195" cy="120" r="2"/>
        <circle cx="195" cy="210" r="2"/>
        <circle cx="195" cy="300" r="2"/>
        <circle cx="195" cy="390" r="2"/>
      </g>
      <g className="login-orbit-labels" fill="currentColor">
        <text x="160" y="125" textAnchor="end">SALUD</text>
        <text x="160" y="215" textAnchor="end">PLANIFICACIÓN</text>
        <text x="160" y="305" textAnchor="end">TRATAMIENTO</text>
        <text x="160" y="395" textAnchor="end">EVOLUCIÓN</text>
      </g>
    </svg>
  )
}

export function LoginBrand() {
  return (
    <div className="login-brand">
      <svg className="login-brand-mark" viewBox="0 0 64 72" fill="none" aria-hidden="true">
        <path d="M32 10C24 10 19 5 12 8 4 11 5 23 8 33c3 11 8 30 13 31 5 1 6-18 11-18s6 19 11 18c5-1 10-20 13-31 3-10 4-22-4-25-7-3-12 2-20 2Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div>
        <p className="login-brand-name">Clínica <strong>Dental</strong></p>
        <p className="login-brand-description">Historial clínico odontológico</p>
      </div>
    </div>
  )
}

export function LoginVisual() {
  return (
    <section className="login-visual" aria-label="Clínica Dental">
      <span className="login-tooth-effect" aria-hidden="true">
        <span className="login-tooth-float"/>
        <span className="login-tooth-sheen"/>
      </span>
      <DentalOrbit/>
      <div className="login-visual-content">
        <LoginBrand/>
        <div className="login-visual-copy">
          <h2>Gestión clínica odontológica</h2>
          <p className="login-visual-summary">Información organizada para el trabajo diario del consultorio.</p>
          <ul className="login-clinical-areas">
            {clinicalAreas.map(({ icon: Icon, title, description }) => (
              <li key={title}>
                <Icon aria-hidden="true"/>
                <div><h3>{title}</h3><p>{description}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
