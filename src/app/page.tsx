'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  TrendingUp,
  Sparkles,
  Key,
  HeadphonesIcon,
  ClipboardCheck,
  Home,
  Banknote,
  BarChart3,
  CheckCircle2,
  Star,
  Quote,
  ChevronRight,
  Bed,
  Bath,
  Maximize,
  MapPin,
  Award,
} from 'lucide-react';

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );
    const els = ref.current?.querySelectorAll('.reveal');
    els?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function HomePage() {
  const contentRef = useReveal();

  const stats = [
    { number: '150+', label: 'Immobili Gestiti' },
    { number: '98%', label: 'Tasso Occupazione' },
    { number: '60+', label: 'Anni di Esperienza' },
    { number: '4.9', label: 'Rating Medio Ospiti' },
  ];

  const services = [
    {
      icon: ClipboardCheck,
      title: 'Gestione Completa',
      desc: 'Dalla creazione degli annunci alla gestione degli ospiti, pensiamo a tutto noi. Zero pensieri per te.',
      color: 'from-blue-500 to-primary-600',
    },
    {
      icon: Banknote,
      title: 'Affitto Garantito',
      desc: 'Formula unica: ti paghiamo un canone fisso mensile garantito, indipendentemente dall\'occupazione.',
      color: 'from-gold-500 to-amber-600',
    },
    {
      icon: Sparkles,
      title: 'Home Staging',
      desc: 'Trasformiamo il tuo immobile per massimizzare il suo appeal e il rendimento sulle piattaforme.',
      color: 'from-purple-500 to-violet-600',
    },
    {
      icon: Key,
      title: 'Check-in & Check-out',
      desc: 'Accoglienza professionale degli ospiti con self check-in smart o accoglienza personale.',
      color: 'from-emerald-500 to-green-600',
    },
    {
      icon: Shield,
      title: 'Assistenza Burocratica',
      desc: 'Comunicazione Alloggiati, tassa di soggiorno, contratti, SCIA: gestiamo ogni adempimento.',
      color: 'from-red-500 to-rose-600',
    },
    {
      icon: HeadphonesIcon,
      title: 'Supporto 24/7',
      desc: 'Assistenza continua per gli ospiti e pronto intervento per qualsiasi necessità dell\'immobile.',
      color: 'from-cyan-500 to-teal-600',
    },
  ];

  const formulas = [
    {
      name: 'Gestione Standard',
      highlight: false,
      features: [
        'Creazione e gestione annunci',
        'Comunicazione con ospiti',
        'Check-in / Check-out',
        'Pulizie professionali',
        'Comunicazione Alloggiati',
        'Report mensile rendimenti',
      ],
      cta: 'Scopri di Più',
    },
    {
      name: 'Gestione Premium',
      highlight: true,
      features: [
        'Tutto della Gestione Standard',
        'Home staging completo',
        'Fotografia professionale',
        'Manutenzione ordinaria inclusa',
        'Revenue management dinamico',
        'Ottimizzazione prezzi AI',
      ],
      cta: 'La Più Scelta',
    },
    {
      name: 'Affitto Garantito',
      highlight: false,
      features: [
        'Canone mensile fisso garantito',
        'Nessun rischio di vacancy',
        'Manutenzione a nostro carico',
        'Zero pensieri totale',
        'Contratto pluriennale',
        'Rivalutazione annuale',
      ],
      cta: 'Scopri di Più',
    },
  ];

  const testimonials = [
    {
      name: 'Marco R.',
      location: 'Roma',
      text: 'Ho affidato il mio bilocale a Immobiliare Fiumana e in 6 mesi il rendimento è triplicato rispetto all\'affitto tradizionale.',
      rating: 5,
    },
    {
      name: 'Giulia T.',
      location: 'Firenze',
      text: 'Professionalità incredibile. La formula affitto garantito mi dà serenità totale, ricevo il mio canone ogni mese senza pensieri.',
      rating: 5,
    },
    {
      name: 'Antonio L.',
      location: 'Rimini',
      text: 'Il mio appartamento è sempre occupato e le recensioni degli ospiti sono eccellenti. Consigliatissimi!',
      rating: 5,
    },
  ];

  const steps = [
    { num: '01', title: 'Contattaci', desc: 'Valutiamo insieme il potenziale del tuo immobile con una consulenza gratuita.' },
    { num: '02', title: 'Analisi & Proposta', desc: 'Prepariamo un piano personalizzato con stima dei ricavi e formula su misura.' },
    { num: '03', title: 'Preparazione', desc: 'Allestiamo l\'immobile, creiamo gli annunci e gestiamo tutta la burocrazia.' },
    { num: '04', title: 'Guadagna', desc: 'Il tuo immobile genera reddito. Tu ti godi i risultati, noi facciamo il resto.' },
  ];

  const properties = [
    {
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
      title: 'Appartamento Centro Storico',
      location: 'Forlì',
      beds: 2,
      baths: 1,
      sqm: 75,
      price: '€120/notte',
    },
    {
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
      title: 'Loft Design Moderno',
      location: 'Cesena',
      beds: 1,
      baths: 1,
      sqm: 55,
      price: '€95/notte',
    },
    {
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      title: 'Villa con Giardino',
      location: 'Rimini',
      beds: 4,
      baths: 3,
      sqm: 180,
      price: '€280/notte',
    },
    {
      image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
      title: 'Attico Vista Mare',
      location: 'Riccione',
      beds: 3,
      baths: 2,
      sqm: 120,
      price: '€200/notte',
    },
  ];

  return (
    <div ref={contentRef}>
      {/* === HERO === */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80)'
          }}
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-950/95 via-primary-900/85 to-primary-900/70" />

        {/* Decorative shapes */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-gold-400/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex flex-wrap gap-3 mb-8 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-gold-300 text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  Dal 1965 nel settore immobiliare
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm font-semibold shadow-lg">
                  <Award className="w-4 h-4" />
                  Superhost Airbnb
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white leading-tight mb-6 animate-slide-up">
                Trasformiamo il tuo immobile in una{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
                  fonte di reddito
                </span>
              </h1>

              <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
                Gestione professionale completa per affitti brevi in tutta Italia.
                Dalla preparazione dell&apos;immobile alla burocrazia, fino alla formula
                dell&apos;affitto garantito. Una soluzione per ogni esigenza.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <Link href="/contatti" className="btn-primary text-lg">
                  Valutazione Gratuita
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
                <Link href="/servizi" className="btn-secondary text-lg">
                  Scopri i Servizi
                </Link>
              </div>
            </div>

            {/* Hero Right - Stats Cards */}
            <div className="hidden lg:grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className="glass-card p-6 text-center transform hover:scale-105 transition-transform duration-300"
                  style={{ animationDelay: `${0.8 + i * 0.15}s` }}
                >
                  <div className="text-3xl font-bold text-gold-400 mb-1">{stat.number}</div>
                  <div className="text-white/60 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Stats */}
          <div className="lg:hidden grid grid-cols-2 gap-3 mt-12 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card p-4 text-center">
                <div className="text-2xl font-bold text-gold-400">{stat.number}</div>
                <div className="text-white/60 text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* === SERVICES === */}
      <section className="section-padding bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 reveal">
            <span className="text-gold-500 font-semibold text-sm uppercase tracking-widest">
              I Nostri Servizi
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mt-3 mb-4">
              Tutto ciò di cui hai bisogno,{' '}
              <span className="gradient-text">in un unico partner</span>
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Offriamo un servizio chiavi in mano per la gestione del tuo immobile.
              Dalla burocrazia alla manutenzione, passando per l&apos;accoglienza degli ospiti.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, i) => (
              <div
                key={service.title}
                className="reveal card-hover p-8 group"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <service.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                <p className="text-gray-500 leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === HOW IT WORKS === */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 reveal">
            <span className="text-gold-500 font-semibold text-sm uppercase tracking-widest">
              Come Funziona
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mt-3">
              4 semplici passi per{' '}
              <span className="gradient-text">iniziare a guadagnare</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={step.num} className="reveal text-center relative" style={{ transitionDelay: `${i * 0.15}s` }}>
                {i < 3 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-gold-300 to-transparent" />
                )}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-2xl font-bold text-white">{step.num}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === PROPERTIES === */}
      <section className="section-padding bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 reveal">
            <span className="text-gold-500 font-semibold text-sm uppercase tracking-widest">
              Portfolio
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mt-3 mb-4">
              Immobili in{' '}
              <span className="gradient-text">Gestione</span>
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Alcuni degli immobili che gestiamo con successo per i nostri clienti.
              Ogni proprietà è curata nei minimi dettagli.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {properties.map((property, i) => (
              <div
                key={property.title}
                className="reveal group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={property.image}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute top-4 right-4 px-3 py-1 bg-gold-500 text-white text-sm font-semibold rounded-full">
                    {property.price}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{property.title}</h3>
                  <div className="flex items-center text-gray-500 text-sm mb-4">
                    <MapPin className="w-4 h-4 mr-1" />
                    {property.location}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4 text-primary-600" />
                      <span>{property.beds}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="w-4 h-4 text-primary-600" />
                      <span>{property.baths}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Maximize className="w-4 h-4 text-primary-600" />
                      <span>{property.sqm}m²</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 reveal">
            <Link href="/contatti" className="btn-outline">
              Affidaci il Tuo Immobile
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* === FORMULAS === */}
      <section className="section-padding hero-gradient particles-overlay">
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16 reveal">
            <span className="text-gold-400 font-semibold text-sm uppercase tracking-widest">
              Le Nostre Formule
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mt-3 mb-4">
              La formula giusta per ogni esigenza
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Scegli la modalità di collaborazione più adatta alle tue necessità.
              Ogni formula è personalizzabile in base al tuo immobile.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {formulas.map((formula, i) => (
              <div
                key={formula.name}
                className={`reveal rounded-2xl p-8 relative ${
                  formula.highlight
                    ? 'bg-white shadow-2xl scale-105 border-2 border-gold-400'
                    : 'bg-white/10 backdrop-blur-lg border border-white/20'
                }`}
                style={{ transitionDelay: `${i * 0.15}s` }}
              >
                {formula.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1 bg-gradient-to-r from-gold-500 to-gold-600 text-white text-sm font-semibold rounded-full">
                    Più Popolare
                  </div>
                )}
                <h3
                  className={`text-xl font-bold mb-6 ${
                    formula.highlight ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  {formula.name}
                </h3>
                <ul className="space-y-4 mb-8">
                  {formula.features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-start gap-3 text-sm ${
                        formula.highlight ? 'text-gray-600' : 'text-white/70'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-5 h-5 flex-shrink-0 ${
                          formula.highlight ? 'text-gold-500' : 'text-gold-400'
                        }`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contatti"
                  className={`block w-full text-center py-3 rounded-full font-semibold transition-all duration-300 ${
                    formula.highlight
                      ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-white hover:shadow-lg'
                      : 'border-2 border-white/30 text-white hover:bg-white hover:text-primary-900'
                  }`}
                >
                  {formula.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === TESTIMONIALS === */}
      <section className="section-padding bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Image */}
            <div className="relative reveal hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=800&q=80"
                  alt="Interno appartamento di lusso"
                  className="w-full h-[500px] object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-gold-500 text-white p-6 rounded-2xl shadow-xl">
                <div className="text-4xl font-bold">500+</div>
                <div className="text-sm opacity-90">Clienti Soddisfatti</div>
              </div>
            </div>

            {/* Right - Testimonials */}
            <div>
              <div className="mb-10 reveal">
                <span className="text-gold-500 font-semibold text-sm uppercase tracking-widest">
                  Testimonial
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mt-3">
                  Cosa dicono i nostri{' '}
                  <span className="gradient-text">proprietari</span>
                </h2>
              </div>

              <div className="space-y-6">
                {testimonials.map((t, i) => (
                  <div
                    key={t.name}
                    className="reveal bg-gray-50 rounded-xl p-6 border-l-4 border-gold-500"
                    style={{ transitionDelay: `${i * 0.15}s` }}
                  >
                    <p className="text-gray-600 leading-relaxed mb-4 italic">&ldquo;{t.text}&rdquo;</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{t.name}</div>
                        <div className="text-sm text-gray-400">{t.location}</div>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: t.rating }).map((_, j) => (
                          <Star key={j} className="w-4 h-4 text-gold-400 fill-gold-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === FINAL CTA === */}
      <section className="section-padding bg-gradient-to-r from-primary-900 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 particles-overlay" />
        <div className="max-w-4xl mx-auto text-center relative reveal">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
            Pronto a far rendere il tuo immobile?
          </h2>
          <p className="text-white/70 text-lg mb-10 max-w-2xl mx-auto">
            Richiedi una valutazione gratuita e scopri quanto può guadagnare il tuo immobile
            con la gestione professionale di Immobiliare Fiumana.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contatti" className="btn-primary text-lg">
              Richiedi Valutazione Gratuita
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <a href="tel:+393884885053" className="btn-secondary text-lg">
              Chiama Ora
              <Phone className="w-5 h-5 ml-2" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function Phone(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}
