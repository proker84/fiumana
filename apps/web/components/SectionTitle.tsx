import { ReactNode } from 'react';

export default function SectionTitle({ title, subtitle }: { title: string; subtitle: ReactNode }) {
  return (
    <div className="mb-10">
      <p className="text-sm uppercase tracking-[0.3em] text-cyan/70">Immobiliare Fiumana</p>
      <h2 className="mt-3 text-3xl font-display text-white md:text-4xl">{title}</h2>
      <div className="mt-3 max-w-2xl text-sm text-white/60">{subtitle}</div>
    </div>
  );
}
