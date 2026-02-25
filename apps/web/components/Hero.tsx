'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 hero-glow" />
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">
            Property Management • Portfolio Premium • Affitti brevi
          </p>
          <h1 className="mt-6 text-4xl font-display leading-tight md:text-5xl">
            Gestione immobiliare evoluta: <span className="text-gradient">lungo termine + affitti brevi</span>
          </h1>
          <p className="mt-6 text-lg text-white/70">
            Immobiliare Fiumana combina performance, tecnologia e cura operativa per valorizzare ogni immobile.
            Dashboard, canali digitali e assistenza dedicata per proprietari e investitori.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/proprietari"
              className="rounded-full bg-cyan px-6 py-3 text-sm font-semibold text-base hover:bg-teal"
            >
              Richiedi valutazione
            </Link>
            <Link
              href="/portfolio"
              className="rounded-full border border-white/20 px-6 py-3 text-sm text-white/80 hover:border-cyan hover:text-cyan"
            >
              Esplora il portfolio
            </Link>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="glass rounded-3xl p-6 shadow-glow"
        >
          <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-surface">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
              poster="https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=1200&q=80"
            >
              <source src="/hero-video.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="mt-6 grid gap-3 text-sm text-white/70">
            <div className="flex items-center justify-between">
              <span>Asset monitorati</span>
              <span className="text-cyan">120+ unità</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Occupazione media</span>
              <span className="text-cyan">96%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tempo medio risposta</span>
              <span className="text-cyan">&lt; 15 min</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
