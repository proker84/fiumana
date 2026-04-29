'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  TrendingUp,
  Sparkles,
  Key,
  HeadphonesIcon,
  ClipboardCheck,
  Camera,
  Wrench,
  FileText,
  Building,
  PiggyBank,
  Scale,
  CheckCircle2,
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

export default function ServiziPage() {
  const contentRef = useReveal();

  const mainServices = [
    {
      icon: ClipboardCheck,
      title: 'Gestione Annunci e Prenotazioni',
      desc: 'Creiamo e ottimizziamo i tuoi annunci su tutte le principali piattaforme (Airbnb, Booking.com, VRBO, Expedia). Gestiamo calendario, prezzi dinamici e comunicazioni con gli ospiti.',
      features: ['Multi-piattaforma', 'Pricing dinamico', 'Risposta entro 1 ora', 'Calendario sincronizzato'],
    },
    {
      icon: Key,
      title: 'Check-in e Check-out Professionali',
      desc: 'Check-in personalizzato. Guide dell\'alloggio in più lingue, supporto 24/7 durante il soggiorno.',
      features: ['Check-in personalizzato', 'Guide multilingua', 'Supporto H24'],
    },
    {
      icon: Sparkles,
      title: 'Home Staging e Fotografia',
      desc: 'Trasformiamo il tuo immobile con allestimenti professionali e servizi fotografici che aumentano fino al 40% il tasso di prenotazione.',
      features: ['Interior design', 'Fotografia HDR', 'Virtual tour 360°', 'Styling stagionale'],
    },
    {
      icon: Shield,
      title: 'Gestione Burocratica Completa',
      desc: 'Pensiamo a tutti gli adempimenti: comunicazione Portale Alloggiati, tassa di soggiorno, SCIA, contratti, fatturazione e dichiarazioni fiscali.',
      features: ['Portale Alloggiati', 'Tassa di soggiorno', 'SCIA e permessi', 'Consulenza fiscale'],
    },
    {
      icon: Wrench,
      title: 'Manutenzione e Pulizie',
      desc: 'Rete di professionisti affidabili per pulizie professionali tra un soggiorno e l\'altro, manutenzione ordinaria e straordinaria.',
      features: ['Pulizie certificate', 'Manutenzione rapida', 'Biancheria premium', 'Inventario costante'],
    },
    {
      icon: TrendingUp,
      title: 'Revenue Management',
      desc: 'Algoritmi avanzati per ottimizzare le tariffe in base a stagionalità, eventi, domanda e competitor. Massimizziamo i tuoi ricavi.',
      features: ['Analisi di mercato', 'Prezzi automatici', 'Report dettagliati', 'Obiettivi su misura'],
    },
  ];

  const guaranteedFeatures = [
    { icon: PiggyBank, title: 'Canone Fisso Mensile', desc: 'Ricevi un importo concordato ogni mese, puntualmente, indipendentemente dall\'occupazione dell\'immobile.' },
    { icon: Shield, title: 'Zero Rischi', desc: 'Nessun rischio di mancati guadagni, vacancy o problemi con gli ospiti. Tutto a carico nostro.' },
    { icon: Wrench, title: 'Manutenzione Inclusa', desc: 'Tutte le spese di manutenzione ordinaria e straordinaria sono a carico nostro.' },
    { icon: Scale, title: 'Contratto Trasparente', desc: 'Contratto pluriennale chiaro e trasparente con rivalutazione annuale del canone.' },
  ];

  return (
    <div ref={contentRef}>
      {/* Hero */}
      <section className="relative pt-32 pb-20 hero-gradient particles-overlay">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <span className="text-gold-400 font-semibold text-sm uppercase tracking-widest">
            I Nostri Servizi
          </span>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mt-4 mb-6">
            Una gestione completa,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
              pensata per te
            </span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Da oltre 60 anni nel settore immobiliare, offriamo soluzioni su misura per proprietari
            che vogliono massimizzare i rendimenti con gli affitti brevi, senza stress.
          </p>
        </div>
      </section>

      {/* Main Services */}
      <section className="section-padding bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-16">
            {mainServices.map((service, i) => (
              <div
                key={service.title}
                className={`reveal grid md:grid-cols-2 gap-12 items-center ${
                  i % 2 === 1 ? 'md:direction-rtl' : ''
                }`}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-6 shadow-lg">
                    <service.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{service.title}</h3>
                  <p className="text-gray-500 leading-relaxed mb-6">{service.desc}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {service.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`${i % 2 === 1 ? 'md:order-1' : ''}`}>
                  <div className="bg-gradient-to-br from-primary-100 to-gold-50 rounded-2xl p-12 flex items-center justify-center aspect-square max-w-sm mx-auto">
                    <service.icon className="w-32 h-32 text-primary-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guaranteed Rent Section */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 reveal">
            <span className="text-gold-500 font-semibold text-sm uppercase tracking-widest">
              Formula Esclusiva
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mt-3 mb-4">
              Affitto Garantito:{' '}
              <span className="gradient-text">zero pensieri, guadagno sicuro</span>
            </h2>
            <p className="text-gray-500 max-w-3xl mx-auto">
              Con la nostra formula esclusiva di Affitto Garantito, ti offriamo un canone mensile fisso
              per il tuo immobile. Noi ci occupiamo di tutto — gestione, manutenzione, ospiti — e tu
              ricevi il tuo compenso ogni mese, puntualmente, senza alcun rischio.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {guaranteedFeatures.map((feat, i) => (
              <div
                key={feat.title}
                className="reveal card-hover p-8 text-center border-2 border-gold-100"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="w-16 h-16 rounded-full bg-gold-50 flex items-center justify-center mx-auto mb-6">
                  <feat.icon className="w-8 h-8 text-gold-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{feat.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ready to work section */}
      <section className="section-padding bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="reveal bg-gradient-to-r from-primary-900 to-primary-800 rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 particles-overlay" />
            <div className="relative">
              <Building className="w-16 h-16 text-gold-400 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                Preparazione completa dell&apos;immobile
              </h2>
              <p className="text-white/70 text-lg max-w-2xl mx-auto mb-8">
                Se il tuo immobile necessita di lavori per essere pronto agli affitti brevi, ci pensiamo
                noi. Dalla ristrutturazione leggera all&apos;arredamento completo, gestiamo l&apos;intero processo
                per rendere il tuo immobile competitivo sul mercato.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contatti" className="btn-primary">
                  Richiedi Preventivo Gratuito
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
