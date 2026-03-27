'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Users,
  Target,
  Heart,
  MapPin,
  Award,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.1 }
    );
    ref.current?.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function ChiSiamoPage() {
  const contentRef = useReveal();

  const values = [
    {
      icon: Heart,
      title: 'Passione',
      desc: 'Ogni immobile è unico e merita attenzione. Trattiamo il tuo immobile come fosse nostro.',
    },
    {
      icon: Target,
      title: 'Risultati',
      desc: 'Il nostro obiettivo è massimizzare i tuoi rendimenti con strategie data-driven.',
    },
    {
      icon: Users,
      title: 'Trasparenza',
      desc: 'Report dettagliati, comunicazione costante e nessun costo nascosto.',
    },
    {
      icon: Award,
      title: 'Eccellenza',
      desc: 'Puntiamo alla perfezione nell\'ospitalità, con rating medio superiore a 4.9.',
    },
  ];

  const milestones = [
    { year: '2020', title: 'Fondazione', desc: 'Nasce Immobiliare Fiumana con focus su compravendita e immobili commerciali.' },
    { year: '2023', title: 'Affitti Brevi', desc: 'Iniziamo la specializzazione nella gestione di immobili per affitti brevi.' },
    { year: '2024', title: 'Crescita', desc: 'Superiamo i 100 immobili gestiti con presenza in tutta Italia.' },
    { year: '2025', title: 'Innovazione', desc: 'Lanciamo la formula Affitto Garantito e la piattaforma digitale per proprietari.' },
    { year: '2026', title: 'Espansione', desc: 'Oltre 150 immobili gestiti e apertura a nuovi mercati turistici italiani.' },
  ];

  return (
    <div ref={contentRef}>
      {/* Hero */}
      <section className="relative pt-32 pb-20 hero-gradient particles-overlay">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <span className="text-gold-400 font-semibold text-sm uppercase tracking-widest">
            Chi Siamo
          </span>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mt-4 mb-6">
            La tua proprietà,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
              la nostra missione
            </span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Immobiliare Fiumana è una realtà consolidata nel settore immobiliare italiano,
            specializzata dal 2023 nella gestione professionale di immobili per affitti brevi.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="reveal">
              <span className="text-gold-500 font-semibold text-sm uppercase tracking-widest">
                La Nostra Storia
              </span>
              <h2 className="text-3xl font-display font-bold text-gray-900 mt-3 mb-6">
                Dall&apos;immobiliare tradizionale alla{' '}
                <span className="gradient-text">gestione innovativa</span>
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Immobiliare Fiumana nasce come agenzia immobiliare con un solido portafoglio di immobili
                  commerciali e residenziali in Italia. Nel corso degli anni abbiamo costruito una
                  rete di competenze e relazioni che ci permette di offrire un servizio a 360 gradi.
                </p>
                <p>
                  Dal 2023, rispondendo alla crescente domanda del mercato, ci siamo specializzati nella
                  gestione di immobili per affitti brevi. La nostra esperienza nel settore immobiliare,
                  unita a competenze digitali e di hospitality, ci ha permesso di creare un modello
                  di gestione unico e altamente performante.
                </p>
                <p>
                  Oggi offriamo un ventaglio completo di soluzioni: dalla gestione standard alla formula
                  esclusiva di Affitto Garantito, dove siamo noi a pagare direttamente un canone fisso
                  al proprietario. Una formula pensata per chi vuole tranquillità assoluta e rendimenti certi.
                </p>
              </div>
            </div>
            <div className="reveal" style={{ transitionDelay: '0.2s' }}>
              <div className="bg-gradient-to-br from-primary-100 to-gold-50 rounded-3xl p-12 text-center">
                <Building2 className="w-24 h-24 text-primary-300 mx-auto mb-6" />
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-2xl font-bold text-primary-600">150+</div>
                    <div className="text-sm text-gray-500">Immobili Gestiti</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-2xl font-bold text-gold-500">98%</div>
                    <div className="text-sm text-gray-500">Tasso Occupazione</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-2xl font-bold text-primary-600">10k+</div>
                    <div className="text-sm text-gray-500">Ospiti Accolti</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-2xl font-bold text-gold-500">4.9</div>
                    <div className="text-sm text-gray-500">Rating Medio</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 reveal">
            <span className="text-gold-500 font-semibold text-sm uppercase tracking-widest">
              I Nostri Valori
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mt-3">
              Cosa ci guida ogni giorno
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((v, i) => (
              <div
                key={v.title}
                className="reveal card-hover p-8 text-center"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-6">
                  <v.icon className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{v.title}</h3>
                <p className="text-gray-500 text-sm">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-padding bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 reveal">
            <span className="text-gold-500 font-semibold text-sm uppercase tracking-widest">
              Il Nostro Percorso
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mt-3">
              Tappe importanti
            </h2>
          </div>
          <div className="relative">
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 to-gold-400" />
            <div className="space-y-12">
              {milestones.map((m, i) => (
                <div
                  key={m.year}
                  className={`reveal flex items-center gap-8 ${
                    i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                  style={{ transitionDelay: `${i * 0.1}s` }}
                >
                  <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'} hidden md:block`}>
                    <h3 className="text-lg font-bold text-gray-900">{m.title}</h3>
                    <p className="text-gray-500 text-sm mt-1">{m.desc}</p>
                  </div>
                  <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-gold-400 flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-white font-bold text-sm">{m.year}</span>
                  </div>
                  <div className="flex-1 md:hidden">
                    <h3 className="text-lg font-bold text-gray-900">{m.title}</h3>
                    <p className="text-gray-500 text-sm mt-1">{m.desc}</p>
                  </div>
                  <div className={`flex-1 hidden md:block ${i % 2 === 0 ? '' : ''}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-gradient-to-r from-primary-900 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 particles-overlay" />
        <div className="max-w-4xl mx-auto text-center relative reveal">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-6">
            Entra a far parte della nostra storia
          </h2>
          <p className="text-white/70 text-lg mb-10">
            Scopri come possiamo valorizzare il tuo immobile con la nostra esperienza e professionalità.
          </p>
          <Link href="/contatti" className="btn-primary text-lg">
            Contattaci Ora
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>
    </div>
  );
}
