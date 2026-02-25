'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setStatus('Credenziali non valide');
      return;
    }

    const data = await response.json();
    setToken(data.accessToken);
    setStatus('Accesso effettuato');
  }

  async function loadProperties() {
    if (!token) return;
    const response = await fetch(`${baseUrl}/properties`);
    const data = await response.json();
    setProperties(data.items ?? []);
  }

  async function loadPosts() {
    if (!token) return;
    const response = await fetch(`${baseUrl}/admin/posts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setPosts(data ?? []);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <div className="glass rounded-3xl p-8">
        <h1 className="text-2xl font-display">Admin Console</h1>
        <p className="mt-2 text-sm text-white/60">
          Gestisci immobili, contenuti e lead. Per una UI completa aggiungere moduli CRUD dedicati.
        </p>
        {!token && (
          <form onSubmit={handleLogin} className="mt-6 grid gap-4 md:grid-cols-3">
            <input
              name="email"
              placeholder="Email admin"
              className="rounded-lg bg-surface px-4 py-3 text-white"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              className="rounded-lg bg-surface px-4 py-3 text-white"
              required
            />
            <button
              type="submit"
              className="rounded-full bg-cyan px-6 py-3 text-sm font-semibold text-base hover:bg-teal"
            >
              Accedi
            </button>
          </form>
        )}
        {status && <p className="mt-4 text-sm text-cyan">{status}</p>}
        {token && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Immobili</h2>
                <button onClick={loadProperties} className="text-cyan text-sm">
                  Carica
                </button>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                {properties.map((property) => (
                  <li key={property.id}>{property.title}</li>
                ))}
              </ul>
            </div>
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Blog</h2>
                <button onClick={loadPosts} className="text-cyan text-sm">
                  Carica
                </button>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                {posts.map((post) => (
                  <li key={post.id}>{post.title}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
