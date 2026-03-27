'use client';

import { useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle,
  Building,
  Home,
  Warehouse,
  HelpCircle,
} from 'lucide-react';

export default function ContattiPage() {
  const [formData, setFormData] = useState({
    nome: '', cognome: '', email: '', telefono: '',
    citta_immobile: '', tipo_immobile: '', formula_interesse: '', messaggio: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">
            Richiesta Inviata!
          </h2>
          <p className="text-gray-500">
            Grazie per averci contattato. Ti ricontatteremo entro 24 ore lavorative
            per discutere delle possibilità per il tuo immobile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative pt-32 pb-20 hero-gradient particles-overlay">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <span className="text-gold-400 font-semibold text-sm uppercase tracking-widest">
            Contatti
          </span>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mt-4 mb-6">
            Parliamo del tuo{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
              immobile
            </span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Compila il modulo per ricevere una valutazione gratuita e scoprire quanto può rendere
            il tuo immobile con la nostra gestione professionale.
          </p>
        </div>
      </section>

      {/* Form + Info */}
      <section className="section-padding bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Richiedi una Consulenza Gratuita
                </h2>
                <p className="text-gray-500 mb-8">
                  Compila il modulo e ti contatteremo per valutare insieme le migliori opportunità.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                      <input
                        type="text" name="nome" required value={formData.nome} onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                        placeholder="Il tuo nome"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cognome *</label>
                      <input
                        type="text" name="cognome" required value={formData.cognome} onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                        placeholder="Il tuo cognome"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                      <input
                        type="email" name="email" required value={formData.email} onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                        placeholder="email@esempio.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Telefono</label>
                      <input
                        type="tel" name="telefono" value={formData.telefono} onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                        placeholder="+39 333 000 0000"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Città dell&apos;immobile *
                      </label>
                      <input
                        type="text" name="citta_immobile" required value={formData.citta_immobile} onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                        placeholder="Es. Roma, Milano, Firenze..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo di immobile
                      </label>
                      <select
                        name="tipo_immobile" value={formData.tipo_immobile} onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all bg-white"
                      >
                        <option value="">Seleziona...</option>
                        <option value="appartamento">Appartamento</option>
                        <option value="villa">Villa / Casa indipendente</option>
                        <option value="monolocale">Monolocale / Studio</option>
                        <option value="loft">Loft</option>
                        <option value="attico">Attico / Penthouse</option>
                        <option value="altro">Altro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Formula di interesse
                    </label>
                    <select
                      name="formula_interesse" value={formData.formula_interesse} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all bg-white"
                    >
                      <option value="">Seleziona la formula che preferisci...</option>
                      <option value="gestione_standard">Gestione Standard</option>
                      <option value="gestione_premium">Gestione Premium</option>
                      <option value="affitto_garantito">Affitto Garantito</option>
                      <option value="non_so">Non so ancora, vorrei una consulenza</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Messaggio</label>
                    <textarea
                      name="messaggio" value={formData.messaggio} onChange={handleChange} rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none"
                      placeholder="Raccontaci del tuo immobile: in che zona si trova, quante stanze ha, se è già arredato..."
                    />
                  </div>

                  <button
                    type="submit" disabled={loading}
                    className="w-full btn-primary text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Invio in corso...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        Invia Richiesta
                      </span>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar Info */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="font-bold text-gray-900 text-lg mb-6">Contatti Diretti</h3>
                <ul className="space-y-5">
                  <li className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Sede</div>
                      <div className="text-gray-500 text-sm">Via del Seminario, 79<br />59100 Prato (PO)</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Telefono</div>
                      <a href="tel:+393884885053" className="text-primary-600 text-sm hover:underline">
                        +39 388 488 5053
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Email</div>
                      <a href="mailto:immobiliarefiumana@gmail.com" className="text-primary-600 text-sm hover:underline">
                        immobiliarefiumana@gmail.com
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Orari</div>
                      <div className="text-gray-500 text-sm">Lun - Ven: 9:00 - 18:00</div>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-8 text-white">
                <HelpCircle className="w-10 h-10 text-gold-400 mb-4" />
                <h3 className="font-bold text-lg mb-3">Hai domande?</h3>
                <p className="text-white/70 text-sm mb-4">
                  Non esitare a contattarci. Offriamo una prima consulenza completamente
                  gratuita e senza impegno per valutare il tuo immobile.
                </p>
                <a
                  href="tel:+393884885053"
                  className="inline-flex items-center gap-2 text-gold-400 font-semibold text-sm hover:text-gold-300 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Chiamaci subito
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
