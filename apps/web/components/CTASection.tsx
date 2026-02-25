import Link from 'next/link';

export default function CTASection() {
  return (
    <div className="glass rounded-3xl p-10 text-center">
      <h3 className="text-2xl font-display text-white">
        Vuoi massimizzare la resa del tuo immobile?
      </h3>
      <p className="mt-4 text-sm text-white/60">
        Un team dedicato, reportistica avanzata e canali digitali sempre ottimizzati.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        <Link
          href="/proprietari"
          className="rounded-full bg-cyan px-6 py-3 text-sm font-semibold text-base hover:bg-teal"
        >
          Affida la gestione
        </Link>
        <Link
          href="/contatti"
          className="rounded-full border border-white/20 px-6 py-3 text-sm text-white/80 hover:border-cyan hover:text-cyan"
        >
          Parla con un advisor
        </Link>
      </div>
    </div>
  );
}
