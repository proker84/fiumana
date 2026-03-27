import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ArrowRight,
  Instagram,
  Facebook,
  Award,
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-primary-950 to-black text-white">
      {/* CTA Band */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gold-600/20 to-primary-600/20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Hai un immobile da valorizzare?
            </h2>
            <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
              Scopri quanto puoi guadagnare con gli affitti brevi. Consulenza gratuita e senza impegno.
            </p>
            <Link href="/contatti" className="btn-primary text-lg">
              Richiedi una Consulenza Gratuita
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <Image
                src="/images/logo.png"
                alt="Immobiliare Fiumana"
                width={56}
                height={56}
                className="rounded-full"
              />
              <div>
                <span className="text-lg font-display font-bold">Immobiliare</span>
                <span className="text-lg font-display font-bold text-gold-400 ml-1">Fiumana</span>
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              Specializzati nella gestione di immobili per affitti brevi in tutta Italia.
              Massimizziamo il rendimento del tuo immobile con professionalità e trasparenza.
            </p>
            {/* Superhost Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full text-white text-sm font-semibold">
              <Award className="w-4 h-4" />
              Superhost Airbnb
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-gold-400 uppercase tracking-wider text-sm mb-6">
              Navigazione
            </h3>
            <ul className="space-y-3">
              {[
                { href: '/', label: 'Home' },
                { href: '/servizi', label: 'I Nostri Servizi' },
                { href: '/chi-siamo', label: 'Chi Siamo' },
                { href: '/contatti', label: 'Contattaci' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/60 hover:text-gold-400 transition-colors text-sm flex items-center gap-2"
                  >
                    <ArrowRight className="w-3 h-3" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-gold-400 uppercase tracking-wider text-sm mb-6">
              Servizi
            </h3>
            <ul className="space-y-3">
              {[
                'Gestione Completa',
                'Affitto Garantito',
                'Home Staging',
                'Check-in/Check-out',
                'Assistenza Burocratica',
                'Manutenzione',
              ].map((service) => (
                <li key={service}>
                  <span className="text-white/60 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
                    {service}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-gold-400 uppercase tracking-wider text-sm mb-6">
              Contatti
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
                <span className="text-white/60 text-sm">
                  Via del Seminario, 79<br />
                  59100 Prato (PO), Italia
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gold-400 flex-shrink-0" />
                <a
                  href="tel:+393884885053"
                  className="text-white/60 text-sm hover:text-gold-400 transition-colors"
                >
                  +39 388 488 5053
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gold-400 flex-shrink-0" />
                <a
                  href="mailto:immobiliarefiumana@gmail.com"
                  className="text-white/60 text-sm hover:text-gold-400 transition-colors"
                >
                  immobiliarefiumana@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gold-400 flex-shrink-0" />
                <span className="text-white/60 text-sm">Lun - Ven: 9:00 - 18:00</span>
              </li>
            </ul>
            <div className="flex gap-4 mt-6">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-500 transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-500 transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <p className="text-white/40 text-sm">
              &copy; {new Date().getFullYear()} Immobiliare Fiumana S.r.l. Tutti i diritti riservati.
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              <Link href="/privacy" className="text-white/40 text-sm hover:text-white/70 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/cookie-policy" className="text-white/40 text-sm hover:text-white/70 transition-colors">
                Cookie Policy
              </Link>
              <Link href="/termini-condizioni" className="text-white/40 text-sm hover:text-white/70 transition-colors">
                Termini e Condizioni
              </Link>
            </div>
          </div>
          <div className="text-center text-white/30 text-xs">
            Immobiliare Fiumana S.r.l. | P.IVA/C.F. 01340960481 | REA: PO-480791 | Via del Seminario, 79 - 59100 Prato (PO)
          </div>
        </div>
      </div>
    </footer>
  );
}
