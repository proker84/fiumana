'use client';

import { useState, useEffect } from 'react';
import {
  CalendarDays,
  Users,
  Home,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';

interface DashboardData {
  totalBookings: number;
  pendingGuests: number;
  todayCheckins: number;
  alloggiatiPending: number;
  recentBookings: any[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch('/api/bookings?dashboard=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const stats = [
    {
      label: 'Prenotazioni Totali',
      value: data?.totalBookings || 0,
      icon: CalendarDays,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Check-in Oggi',
      value: data?.todayCheckins || 0,
      icon: Home,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Ospiti da Compilare',
      value: data?.pendingGuests || 0,
      icon: Users,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Alloggiati da Inviare',
      value: data?.alloggiatiPending || 0,
      icon: AlertCircle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Panoramica delle prenotazioni e degli adempimenti
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="admin-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Prenotazioni Recenti</h2>
          <a
            href="/admin/prenotazioni"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            Vedi tutte <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

        {data?.recentBookings && data.recentBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 pr-4">ID Booking</th>
                  <th className="pb-3 pr-4">Ospite</th>
                  <th className="pb-3 pr-4">Check-in</th>
                  <th className="pb-3 pr-4">Check-out</th>
                  <th className="pb-3 pr-4">Stato</th>
                  <th className="pb-3">Alloggiati</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentBookings.map((b: any) => (
                  <tr key={b.id} className="text-sm">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-600">{b.booking_id}</td>
                    <td className="py-3 pr-4 font-medium text-gray-900">{b.guest_name || '-'}</td>
                    <td className="py-3 pr-4 text-gray-600">{b.check_in}</td>
                    <td className="py-3 pr-4 text-gray-600">{b.check_out}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                          b.status === 'confirmed'
                            ? 'bg-green-50 text-green-700'
                            : b.status === 'pending'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {b.status === 'confirmed' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3">
                      {b.alloggiati_sent ? (
                        <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Inviato
                        </span>
                      ) : (
                        <span className="text-amber-600 text-xs font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Da inviare
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nessuna prenotazione trovata</p>
            <p className="text-sm mt-1">Importa un file CSV da Airbnb per iniziare</p>
          </div>
        )}
      </div>
    </div>
  );
}
