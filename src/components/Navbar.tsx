'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Phone } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/servizi', label: 'Servizi' },
    { href: '/chi-siamo', label: 'Chi Siamo' },
    { href: '/contatti', label: 'Contatti' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg py-2'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/images/logo.png"
              alt="Immobiliare Fiumana"
              width={56}
              height={56}
              className="rounded-full shadow-lg group-hover:scale-105 transition-transform duration-300"
            />
            <div className="hidden sm:block">
              <span
                className={`text-xl font-display font-bold transition-colors duration-300 ${
                  scrolled ? 'text-primary-900' : 'text-white'
                }`}
              >
                Immobiliare
              </span>
              <span
                className={`text-xl font-display font-bold ml-1 transition-colors duration-300 ${
                  scrolled ? 'text-gold-500' : 'text-gold-400'
                }`}
              >
                Fiumana
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium tracking-wide uppercase transition-all duration-300 hover:text-gold-400 relative group ${
                  scrolled ? 'text-gray-700' : 'text-white/90'
                }`}
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gold-400 transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
            <Link
              href="/contatti"
              className="ml-4 inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
            >
              <Phone className="w-4 h-4" />
              Contattaci
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              scrolled ? 'text-gray-700' : 'text-white'
            }`}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block text-gray-700 font-medium py-2 hover:text-primary-600 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/contatti"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center btn-primary text-sm py-3"
              >
                Contattaci
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
