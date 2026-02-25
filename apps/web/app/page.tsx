import Hero from '../components/Hero';
import SectionTitle from '../components/SectionTitle';
import PillarCard from '../components/PillarCard';
import PropertyCard from '../components/PropertyCard';
import CTASection from '../components/CTASection';
import MapSection from '../components/MapSection';
import { Building2, Home, Sparkles } from 'lucide-react';

const properties = [
  {
    title: 'Attico Panorama Fiumana',
    city: 'Rimini',
    type: 'Residenziale',
    price: '€ 2.400/mese',
    image:
      'https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Hub Commerciale Adriatico',
    city: 'Ravenna',
    type: 'Commerciale',
    price: '€ 5.200/mese',
    image:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Suite Marina Fiumana',
    city: 'Cesenatico',
    type: 'Case Vacanza',
    price: 'da € 190/notte',
    image:
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
  },
];

export default function HomePage() {
  return (
    <main>
      <Hero />
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionTitle
          title="Tre pilastri, un unico controllo"
          subtitle="Gestione immobiliare completa: valorizzazione, locazioni a lungo termine e affitti brevi con channel management pronto all'integrazione."
        />
        <div className="grid gap-6 md:grid-cols-3">
          <PillarCard
            title="Proprietà"
            description="Asset selezionati e performance monitorate in tempo reale."
            icon={<Home />}
          />
          <PillarCard
            title="Gestione per terzi"
            description="Operatività end-to-end, reporting e assistenza dedicata ai proprietari."
            icon={<Building2 />}
          />
          <PillarCard
            title="Affitti brevi"
            description="Ottimizzazione prezzi, calendari e visibilità su Airbnb e Booking.com."
            icon={<Sparkles />}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <SectionTitle
          title="Highlight portfolio"
          subtitle="Selezione di immobili residenziali, commerciali e short stay ad alto potenziale."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.title} {...property} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <CTASection />
      </section>

      <MapSection />
    </main>
  );
}
