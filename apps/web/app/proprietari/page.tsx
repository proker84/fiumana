import SectionTitle from '../../components/SectionTitle';
import LeadForm from '../../components/LeadForm';

export const metadata = {
  title: 'Proprietari',
};

export default function ProprietariPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <SectionTitle
        title="Affida a noi il tuo immobile"
        subtitle="Analisi gratuita, piano di valorizzazione e gestione completa. Lascia i tuoi dati e ti ricontattiamo entro 24h."
      />
      <div className="grid gap-10 md:grid-cols-[1fr_1fr]">
        <div className="glass rounded-3xl p-8">
          <h3 className="text-xl font-display">Perché Immobiliare Fiumana</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/60">
            <li>✔️ Reporting mensile e KPI trasparenti</li>
            <li>✔️ Ottimizzazione prezzi e occupazione</li>
            <li>✔️ Team operativo e manutenzione programmata</li>
            <li>✔️ Canali brevi e lungo termine integrati</li>
          </ul>
        </div>
        <div className="glass rounded-3xl p-8">
          <LeadForm source="OWNER" />
        </div>
      </div>
    </main>
  );
}
