import SectionTitle from '../../components/SectionTitle';
import LeadForm from '../../components/LeadForm';
import MapSection from '../../components/MapSection';

export const metadata = {
  title: 'Contatti',
};

export default function ContattiPage() {
  return (
    <main>
      <div className="mx-auto max-w-6xl px-6 py-20">
        <SectionTitle
          title="Parla con un advisor"
          subtitle="Scrivici per una consulenza o per una valutazione dettagliata del tuo immobile."
        />
        <div className="grid gap-10 md:grid-cols-[1fr_1fr]">
          <div className="glass rounded-3xl p-8">
            <LeadForm source="CONTACT" />
          </div>
          <div className="glass rounded-3xl p-8 text-sm text-white/60">
            <p className="text-white">Immobiliare Fiumana</p>
            <p className="mt-3">Rimini, Italia</p>
            <p className="mt-3">Email: info@immobiliarefiumana.it</p>
            <p>Telefono: +39 0541 000 000</p>
            <a
              href="https://wa.me/390541000000"
              className="mt-6 inline-flex rounded-full border border-cyan/60 px-4 py-2 text-cyan hover:bg-cyan/10"
            >
              Contattaci su WhatsApp
            </a>
          </div>
        </div>
      </div>
      <MapSection />
    </main>
  );
}
