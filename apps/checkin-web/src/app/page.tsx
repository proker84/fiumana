import { Home, AlertCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="glass-card p-8 text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-400/20 to-teal-500/20 flex items-center justify-center">
          <Home className="w-10 h-10 text-cyan-400" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-display font-bold gradient-text mb-4">
          Check-in Online
        </h1>
        <p className="text-slate-400 mb-8">
          Benvenuto nel sistema di check-in online di Fiumana Immobiliare
        </p>

        {/* Info Box */}
        <div className="bg-slate-800/50 rounded-xl p-6 text-left">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-2">Come funziona</h3>
              <p className="text-sm text-slate-400">
                Per effettuare il check-in online, utilizza il link che hai
                ricevuto via email o SMS con la conferma della tua prenotazione.
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Il link ha il formato:{" "}
                <code className="bg-slate-700 px-2 py-0.5 rounded text-cyan-400">
                  checkin.fiumanaimmobiliare.it/[codice-prenotazione]
                </code>
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mt-8 text-center">
          <div className="p-4">
            <div className="text-2xl mb-2">🔒</div>
            <p className="text-xs text-slate-400">Dati cifrati e sicuri</p>
          </div>
          <div className="p-4">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-xs text-slate-400">Check-in veloce</p>
          </div>
          <div className="p-4">
            <div className="text-2xl mb-2">📱</div>
            <p className="text-xs text-slate-400">Ottimizzato mobile</p>
          </div>
        </div>
      </div>
    </div>
  );
}
