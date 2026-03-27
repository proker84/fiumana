'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Upload,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='));
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        document.cookie = `auth_token=${data.token}; path=/; max-age=86400; SameSite=Strict`;
        setIsAuthenticated(true);
      } else {
        setError(data.error || 'Credenziali non valide');
      }
    } catch {
      setError('Errore di connessione');
    }
  };

  const handleLogout = () => {
    document.cookie = 'auth_token=; path=/; max-age=0';
    setIsAuthenticated(false);
  };

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/prenotazioni', icon: CalendarDays, label: 'Prenotazioni' },
    { href: '/admin/import-csv', icon: Upload, label: 'Importa CSV' },
    { href: '/admin/impostazioni', icon: Settings, label: 'Impostazioni' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-950 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Image
              src="/images/logo.png"
              alt="Immobiliare Fiumana"
              width={80}
              height={80}
              className="rounded-full mx-auto mb-4 shadow-lg"
            />
            <h1 className="text-2xl font-display font-bold text-white">Area Amministrazione</h1>
            <p className="text-white/50 text-sm mt-2">Immobiliare Fiumana</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                placeholder="admin"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
            >
              Accedi
            </button>
            <p className="text-center text-xs text-gray-400">
              Credenziali default: admin / admin2024!
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-0">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:pl-64">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-sm text-gray-500">Ciao, Admin</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-60 bg-primary-950 z-50 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={40}
            height={40}
            className="rounded-full"
          />
          <div>
            <div className="text-white font-bold text-sm">Immobiliare</div>
            <div className="text-gold-400 text-xs font-medium">Admin Panel</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-white/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-800 text-gold-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-3 text-white/40 text-xs hover:text-white/70 transition-colors"
          >
            ← Torna al sito
          </Link>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Content */}
      <div className="lg:pl-60 pt-16">
        <div className="p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
