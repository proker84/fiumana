import { CheckCircle2, Home, Calendar, Phone } from "lucide-react";
import Link from "next/link";

interface SuccessPageProps {
  searchParams: Promise<{ property?: string }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { property } = await searchParams;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="glass-card p-8 text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center animate-fade-in">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-display font-bold gradient-text mb-2">
          Check-in completato!
        </h1>
        <p className="text-slate-400 mb-8">
          Grazie per aver completato il check-in online
        </p>

        {/* Property Info */}
        {property && (
          <div className="bg-slate-800/50 rounded-xl p-6 mb-8 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-400/20 flex items-center justify-center">
                <Home className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">La tua struttura</p>
                <p className="font-semibold">{decodeURIComponent(property)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-slate-800/30 rounded-xl p-6 mb-8 text-left">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Prossimi passi
          </h3>
          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">1.</span>
              Riceverai un&apos;email di conferma con tutti i dettagli
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">2.</span>
              Il giorno dell&apos;arrivo riceverai le istruzioni per l&apos;accesso
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">3.</span>
              In caso di domande, consulta le FAQ nell&apos;app
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Phone className="w-4 h-4" />
          <span>Assistenza: +39 123 456 7890</span>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link
            href="/"
            className="text-cyan-400 hover:text-cyan-300 text-sm underline"
          >
            Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}
