import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, ClipboardList, HeartHandshake, Menu, MessageCircle, ShieldCheck, Smartphone, X } from 'lucide-react'
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
            <a className="public-button public-button-primary" href={whatsappUrl} rel="noopener noreferrer" target="_blank"><MessageCircle aria-hidden="true" size={20}/> Escríbenos por WhatsApp <ArrowUpRight aria-hidden="true" size={18}/></a>
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
        <a className="public-button public-button-contact" href={whatsappUrl} rel="noopener noreferrer" target="_blank"><MessageCircle aria-hidden="true" size={21}/> 097 914 1915 <ArrowUpRight aria-hidden="true" size={19}/></a>
      </section>
    </main>

    <footer className="public-footer">
      <div className="public-container public-footer-main"><div><PublicBrand/><p>Atención odontológica y acceso seguro al portal del personal.</p></div><div className="public-footer-links"><a href="#clinica">La clínica</a><a href="#pacientes">Para pacientes</a><a href="#contacto">Contacto</a><Link to="/acceso">Portal del personal</Link></div></div>
      <div className="public-container public-footer-bottom"><span>© {new Date().getFullYear()} Clínica Dental</span><span>Desarrollado por Jordy Rosado, Jereny Vera, Andrés Garcías, Willian Cabrera y Luis.</span></div>
    </footer>
    <a aria-label="Contactar por WhatsApp" className="public-whatsapp-float" href={whatsappUrl} rel="noopener noreferrer" target="_blank"><MessageCircle aria-hidden="true" size={25}/></a>
  </div>
}
