'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Servizi', href: '/servizi' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Proprietari', href: '/proprietari' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contatti', href: '/contatti' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 backdrop-blur-xl bg-base/80 border-b border-white/5"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-display tracking-wide">
          Immobiliare <span className="text-gradient">Fiumana</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-cyan transition">
              {item.label}
            </Link>
          ))}
          <Link
            href="/proprietari"
            className="rounded-full border border-cyan/60 px-4 py-2 text-cyan hover:bg-cyan/10"
          >
            Richiedi valutazione
          </Link>
        </nav>
        <button
          className="md:hidden text-white/80"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Apri menu"
        >
          <Menu />
        </button>
      </div>
      <div
        className={clsx(
          'md:hidden overflow-hidden border-t border-white/5 transition-all',
          open ? 'max-h-96' : 'max-h-0',
        )}
      >
        <div className="flex flex-col gap-4 px-6 py-4 text-white/70">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-cyan">
              {item.label}
            </Link>
          ))}
          <Link href="/proprietari" className="text-cyan">
            Richiedi valutazione
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
