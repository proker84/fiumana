import SectionTitle from '../../components/SectionTitle';
import PropertyCard from '../../components/PropertyCard';

export const metadata = {
  title: 'Portfolio',
};

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
  {
    title: 'Residenza Parco Fiumana',
    city: 'Bologna',
    type: 'Residenziale',
    price: '€ 1.200/mese',
    image:
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80',
  },
];

export default function PortfolioPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <SectionTitle
        title="Portfolio residenziale, commerciale e case vacanza"
        subtitle="Filtra per città, tipologia e fascia prezzo. Ogni immobile è accompagnato da dati chiave e una scheda completa."
      />
      <div className="glass rounded-2xl p-6">
        <div className="grid gap-4 md:grid-cols-4 text-sm text-white/60">
          <select className="rounded-lg bg-surface px-3 py-2 text-white">
            <option>Città</option>
            <option>Rimini</option>
            <option>Bologna</option>
            <option>Ravenna</option>
          </select>
          <select className="rounded-lg bg-surface px-3 py-2 text-white">
            <option>Tipologia</option>
            <option>Residenziale</option>
            <option>Commerciale</option>
            <option>Case vacanza</option>
          </select>
          <select className="rounded-lg bg-surface px-3 py-2 text-white">
            <option>Fascia prezzo</option>
            <option>€ 1.000 - 2.000</option>
            <option>€ 2.000 - 4.000</option>
            <option>€ 4.000+</option>
          </select>
          <select className="rounded-lg bg-surface px-3 py-2 text-white">
            <option>Contract type</option>
            <option>Lungo termine</option>
            <option>Affitti brevi</option>
          </select>
        </div>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {properties.map((property) => (
          <PropertyCard key={property.title} {...property} />
        ))}
      </div>
    </main>
  );
}
