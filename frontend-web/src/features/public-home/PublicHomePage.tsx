import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, ClipboardList, HeartHandshake, Menu, ShieldCheck, Smartphone, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './publicHome.css'

const whatsappNumber = '593979141915'
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola, quisiera información sobre la clínica dental.')}`

const navigation = [
  { href: '#clinica', label: 'La clínica' },
  { href: '#experiencia', label: 'Nuestra atención' },
  { href: '#pacientes', label: 'Para pacientes' },
  { href: '#contacto', label: 'Contacto' },
]

function WhatsAppIcon({ size = 22 }: { size?: number }) {
  return <svg aria-hidden="true" fill="currentColor" focusable="false" height={size} viewBox="0 0 24 24" width={size}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.198.297-.767.966-.94 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.058-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.496.1-.198.05-.372-.025-.521-.075-.149-.669-1.612-.917-2.206-.242-.579-.487-.5-.669-.51-.173-.009-.372-.01-.57-.01-.198 0-.52.074-.792.372-.273.297-1.04 1.016-1.04 2.479s1.065 2.875 1.213 3.073c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.693.625.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.611h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.438-9.886 9.889-9.886a9.82 9.82 0 0 1 6.99 2.896 9.82 9.82 0 0 1 2.895 6.993c-.003 5.45-4.439 9.886-9.889 9.886m8.413-18.306A11.81 11.81 0 0 0 12.053 0C5.48 0 .13 5.349.127 11.926c-.001 2.103.549 4.156 1.595 5.966L.026 24l6.25-1.638a11.9 11.9 0 0 0 5.772 1.47h.005c6.574 0 11.926-5.35 11.929-11.927a11.81 11.81 0 0 0-3.467-8.418Z"/>
  </svg>
}

function PublicBrand() {
  return <span className="public-brand">
    <span aria-hidden="true" className="public-brand-symbol">
      <svg fill="none" viewBox="0 0 64 72"><path d="M32 10C24 10 19 5 12 8 4 11 5 23 8 33c3 11 8 30 13 31 5 1 6-18 11-18s6 19 11 18c5-1 10-20 13-31 3-10 4-22-4-25-7-3-12 2-20 2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4.5"/></svg>
    </span>
    <span className="public-brand-copy"><strong>Clínica Dental</strong><small>Atención odontológica</small></span>
  </span>
}

export function PublicHomePage() {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return <div className="public-home" id="inicio">
    <a className="public-skip-link" href="#contenido">Saltar al contenido</a>
    <header className="public-header">
      <div className="public-header-inner">
        <Link aria-label="Clínica Dental, ir al inicio" className="public-brand-link" onClick={() => setMenuOpen(false)} to="/inicio"><PublicBrand/></Link>
        <button aria-controls="public-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} className="public-menu-toggle" onClick={() => setMenuOpen((value) => !value)} type="button">{menuOpen ? <X aria-hidden="true"/> : <Menu aria-hidden="true"/>}</button>
        <nav aria-label="Navegación pública" className={`public-navigation ${menuOpen ? 'is-open' : ''}`} id="public-navigation">
          {navigation.map((item) => <a href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>)}
          <Link className="public-nav-login" onClick={() => setMenuOpen(false)} to="/acceso">Portal del personal <ArrowUpRight aria-hidden="true" size={17}/></Link>
        </nav>
      </div>
    </header>

    <main id="contenido">
      <section aria-labelledby="public-hero-title" className="public-hero">
        <img alt="Doctora en un consultorio odontológico" className="public-hero-image" fetchPriority="high" src="/images/public-home/doctora-hero.png"/>
        <div className="public-hero-shade"/>
        <div className="public-hero-content public-container">
          <span className="public-eyebrow public-eyebrow-light"><span aria-hidden="true"/> Un espacio para cuidar tu sonrisa</span>
          <h1 id="public-hero-title">Tu salud dental merece una atención cercana.</h1>
          <p>Conoce nuestra clínica y mantente en contacto con nosotros para resolver tus dudas sobre tu atención odontológica.</p>
          <div className="public-hero-actions">
            <a className="public-button public-button-primary" href={whatsappUrl} rel="noopener noreferrer" target="_blank"><WhatsAppIcon size={20}/> Escríbenos por WhatsApp <ArrowUpRight aria-hidden="true" size={18}/></a>
            <a className="public-button public-button-quiet" href="#clinica">Conoce la clínica <ArrowDown aria-hidden="true" size={17}/></a>
          </div>
        </div>
        <div className="public-hero-caption" aria-hidden="true">CLÍNICA DENTAL <span/> CUIDADO CON CONFIANZA</div>
      </section>

      <div className="public-trust-wrap public-container">
        <div className="public-trust-strip" aria-label="Nuestro enfoque">
          <div><HeartHandshake aria-hidden="true"/><span>Una atención que empieza escuchándote</span></div>
          <div><ShieldCheck aria-hidden="true"/><span>Tu información clínica, organizada</span></div>
          <div><Smartphone aria-hidden="true"/><span>Una experiencia conectada para pacientes</span></div>
        </div>
      </div>

      <section aria-labelledby="public-clinic-title" className="public-clinic public-section public-container" id="clinica">
        <div className="public-clinic-photo-wrap"><img alt="Doctora explicando un modelo dental durante una consulta" className="public-clinic-photo" loading="lazy" src="/images/public-home/doctora-consulta.png"/><span className="public-photo-accent" aria-hidden="true"/></div>
        <div className="public-clinic-copy">
          <span className="public-eyebrow">LA CLÍNICA</span>
          <h2 id="public-clinic-title">Cuidar de ti es también tomarnos el tiempo de escucharte.</h2>
          <p>Cada visita comienza con una conversación. Conocer tus inquietudes nos ayuda a acompañarte durante tu atención y seguimiento dental.</p>
          <a className="public-text-link" href="#contacto">Habla con nosotros <ArrowUpRight aria-hidden="true" size={19}/></a>
        </div>
      </section>

      <section aria-labelledby="public-experience-title" className="public-experience" id="experiencia">
        <div className="public-container public-experience-inner">
          <div className="public-experience-heading"><span className="public-eyebrow public-eyebrow-light">NUESTRA ATENCIÓN</span><h2 id="public-experience-title">Cercanía en la consulta.<br/><em>Claridad después de ella.</em></h2></div>
          <div className="public-experience-copy"><p>El consultorio y la aplicación para pacientes comparten un mismo sistema. Así puedes consultar tu información y mantenerte al tanto de tus citas desde el móvil.</p><a href="#pacientes">Descubre la experiencia para pacientes <ArrowRight aria-hidden="true" size={18}/></a></div>
        </div>
        <div aria-hidden="true" className="public-experience-orbit"/>
      </section>

      <section aria-labelledby="public-patient-title" className="public-patient public-section public-container" id="pacientes">
        <div className="public-patient-heading"><span className="public-eyebrow">PARA PACIENTES</span><h2 id="public-patient-title">Tu información dental, también contigo.</h2><p>La aplicación móvil reúne las funciones disponibles para los pacientes. El acceso del personal se mantiene separado en este sitio web.</p></div>
        <div className="public-patient-list">
          <div><span className="public-patient-icon"><CalendarDays aria-hidden="true"/></span><div><h3>Solicita tus citas</h3><p>Envía una solicitud desde la aplicación móvil.</p></div><span className="public-patient-index">01</span></div>
          <div><span className="public-patient-icon"><ClipboardList aria-hidden="true"/></span><div><h3>Consulta tu historial</h3><p>Revisa la información clínica disponible para tu cuenta.</p></div><span className="public-patient-index">02</span></div>
          <div><span className="public-patient-icon"><ShieldCheck aria-hidden="true"/></span><div><h3>Explora los servicios</h3><p>Descubre el catálogo activo publicado por la clínica.</p></div><span className="public-patient-index">03</span></div>
        </div>
      </section>

      <section aria-labelledby="public-contact-title" className="public-contact public-container" id="contacto">
        <div><span className="public-eyebrow public-eyebrow-light">CONTACTO</span><h2 id="public-contact-title">Estamos a un mensaje de distancia.</h2><p>¿Tienes una consulta? Escríbenos y continuamos la conversación por WhatsApp.</p></div>
        <a className="public-button public-button-contact" href={whatsappUrl} rel="noopener noreferrer" target="_blank"><WhatsAppIcon size={21}/> 097 914 1915 <ArrowUpRight aria-hidden="true" size={19}/></a>
      </section>
    </main>

    <footer className="public-footer">
      <div className="public-container public-footer-main"><div><PublicBrand/><p>Atención odontológica y acceso seguro al portal del personal.</p></div><div className="public-footer-links"><a href="#clinica">La clínica</a><a href="#pacientes">Para pacientes</a><a href="#contacto">Contacto</a><Link to="/acceso">Portal del personal</Link></div></div>
      <div className="public-container public-footer-bottom"><span>© {new Date().getFullYear()} Clínica Dental</span><span>Desarrollado por Jordy Rosado, Jereny Vera, Andrés Garcías, Willian Cabrera y Luis.</span></div>
    </footer>
    <a aria-label="Contactar por WhatsApp" className="public-whatsapp-float" href={whatsappUrl} rel="noopener noreferrer" target="_blank"><WhatsAppIcon size={28}/></a>
  </div>
}
