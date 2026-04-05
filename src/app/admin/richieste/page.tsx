'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Home,
  Calendar,
  CheckCircle2,
  Circle,
  Loader2,
  MessageSquare,
  User,
  Trash2,
} from 'lucide-react';

interface ContactRequest {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  citta_immobile: string | null;
  tipo_immobile: string | null;
  formula_interesse: string | null;
  messaggio: string | null;
  letto: number;
  created_at: string;
}

const FORMULA_LABELS: Record<string, string> = {
  gestione_standard: 'Gestione Standard',
  affitto_garantito: 'Affitto Garantito',
  consulenza: 'Consulenza',
};

const TIPO_LABELS: Record<string, string> = {
  appartamento: 'Appartamento',
  villa: 'Villa',
  casa: 'Casa',
  altro: 'Altro',
};

export default function RichiestePage() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch('/api/contact-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: number) {
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      await fetch(`/api/contact-requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ letto: 1 }),
      });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, letto: 1 } : r));
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteRequest(id: number) {
    if (!confirm('Sei sicuro di voler eliminare questa richiesta?')) return;

    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      await fetch(`/api/contact-requests/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  const filteredRequests = requests.filter(r => {
    if (filter === 'unread') return r.letto === 0;
    if (filter === 'read') return r.letto === 1;
    return true;
  });

  const unreadCount = requests.filter(r => r.letto === 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Richieste di Contatto</h1>
          <p className="text-gray-500 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} nuove richieste da leggere` : 'Tutte le richieste sono state lette'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tutte ({requests.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Da leggere ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'read' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Lette ({requests.length - unreadCount})
          </button>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="admin-card text-center py-12">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nessuna richiesta trovata</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className={`admin-card ${req.letto === 0 ? 'border-l-4 border-l-primary-500' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    req.letto === 0 ? 'bg-primary-100' : 'bg-gray-100'
                  }`}>
                    <User className={`w-5 h-5 ${req.letto === 0 ? 'text-primary-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {req.nome} {req.cognome}
                      </h3>
                      {req.letto === 0 && (
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                          Nuova
                        </span>
                      )}
                      {req.formula_interesse && (
                        <span className="px-2 py-0.5 bg-gold-100 text-gold-700 text-xs font-medium rounded-full">
                          {FORMULA_LABELS[req.formula_interesse] || req.formula_interesse}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      <a href={`mailto:${req.email}`} className="flex items-center gap-1 hover:text-primary-600">
                        <Mail className="w-4 h-4" />
                        {req.email}
                      </a>
                      {req.telefono && (
                        <a href={`tel:${req.telefono}`} className="flex items-center gap-1 hover:text-primary-600">
                          <Phone className="w-4 h-4" />
                          {req.telefono}
                        </a>
                      )}
                      {req.citta_immobile && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {req.citta_immobile}
                        </span>
                      )}
                      {req.tipo_immobile && (
                        <span className="flex items-center gap-1">
                          <Home className="w-4 h-4" />
                          {TIPO_LABELS[req.tipo_immobile] || req.tipo_immobile}
                        </span>
                      )}
                    </div>

                    {req.messaggio && (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                        {req.messaggio}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {new Date(req.created_at).toLocaleString('it-IT')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {req.letto === 0 && (
                    <button
                      onClick={() => markAsRead(req.id)}
                      className="p-2 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                      title="Segna come letta"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteRequest(req.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="Elimina"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
