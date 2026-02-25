'use client';

import { useState } from 'react';

interface LeadFormProps {
  source: 'CONTACT' | 'OWNER' | 'VALUATION';
}

export default function LeadForm({ source }: LeadFormProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    try {
      const response = await fetch(`${baseUrl}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, source }),
      });

      if (!response.ok) throw new Error('Errore invio');
      setStatus('sent');
      event.currentTarget.reset();
    } catch (error) {
      setStatus('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="name"
          required
          placeholder="Nome e cognome"
          className="rounded-lg bg-surface px-4 py-3 text-white"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-lg bg-surface px-4 py-3 text-white"
        />
      </div>
      <input
        name="phone"
        placeholder="Telefono"
        className="w-full rounded-lg bg-surface px-4 py-3 text-white"
      />
      <input
        name="city"
        placeholder="Città"
        className="w-full rounded-lg bg-surface px-4 py-3 text-white"
      />
      <input
        name="propertyType"
        placeholder="Tipologia immobile"
        className="w-full rounded-lg bg-surface px-4 py-3 text-white"
      />
      <textarea
        name="message"
        required
        rows={4}
        placeholder="Descrivi il tuo immobile e le tue esigenze"
        className="w-full rounded-lg bg-surface px-4 py-3 text-white"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="rounded-full bg-cyan px-6 py-3 text-sm font-semibold text-base hover:bg-teal disabled:opacity-60"
      >
        {status === 'loading' ? 'Invio in corso...' : 'Invia richiesta'}
      </button>
      {status === 'sent' && <p className="text-sm text-cyan">Richiesta inviata correttamente.</p>}
      {status === 'error' && (
        <p className="text-sm text-red-400">Errore durante l'invio. Riprova tra qualche minuto.</p>
      )}
    </form>
  );
}
