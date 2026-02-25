import SectionTitle from '../../components/SectionTitle';

export const metadata = {
  title: 'Servizi',
};

const services = [
  {
    title: 'Property management per terzi',
    description:
      'Gestione completa dell’immobile: canoni, manutenzioni, tenant care, reportistica e ottimizzazione costi.',
  },
  {
    title: 'Gestione affitti brevi',
    description:
      'Configurazione canali Airbnb e Booking.com, pricing dinamico, calendari sincronizzati e supporto ospiti.',
  },
  {
    title: 'Locazioni lungo termine',
    description:
      'Selezione inquilini, contratti solidi e monitoraggio continuo della redditività.',
  },
  {
    title: 'Consulenza e valorizzazione',
    description:
      'Analisi asset, piani di upgrade, home staging e strategia di posizionamento premium.',
  },
];

export default function ServiziPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <SectionTitle
        title="Servizi integrati per immobili ad alte performance"
        subtitle="Soluzioni modulari, tecnologia e un team senior per aumentare redditivività e qualità dell’esperienza di locazione."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {services.map((service) => (
          <div key={service.title} className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white">{service.title}</h3>
            <p className="mt-3 text-sm text-white/60">{service.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 glass rounded-2xl p-8">
        <h4 className="text-xl font-display text-white">Channel-ready, integrazioni future</h4>
        <p className="mt-3 text-sm text-white/60">
          L’infrastruttura è pronta per collegare provider esterni e channel manager, con API pulite e
          schemi dati già predisposti.
        </p>
      </div>
    </main>
  );
}
