import { ReactNode } from 'react';

export default function PillarCard({ title, description, icon }: { title: string; description: string; icon: ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="text-cyan">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm text-white/60">{description}</p>
    </div>
  );
}
