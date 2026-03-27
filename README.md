# Immobiliare Fiumana - Gestione Affitti Brevi

## Panoramica

Sito web per Immobiliare Fiumana con:

- **Sezione pubblica**: Homepage, Servizi, Chi Siamo, Contatti con form per richieste di gestione immobili
- **Area Admin**: Dashboard, importazione prenotazioni CSV da Airbnb, gestione prenotazioni, generazione link per ospiti
- **Form Ospiti**: Pagina pubblica dove gli ospiti compilano documenti per il Portale Alloggiati
- **API Alloggiati**: Integrazione con il Portale Alloggiati della Polizia di Stato (SOAP + file TXT)

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **SQLite** (via better-sqlite3)
- **JWT** per autenticazione admin

## Setup Locale

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

### Credenziali Admin Default
- Username: `admin`
- Password: `admin2024!`

## Deploy su Vercel

1. Push il repo su GitHub
2. Importa il progetto su [vercel.com](https://vercel.com)
3. Configura le variabili d'ambiente:
   - `JWT_SECRET` - chiave segreta per JWT
   - `NEXT_PUBLIC_BASE_URL` - URL del sito
4. Deploy!

**Nota**: Per la produzione, SQLite non è ideale su Vercel (serverless). Considerare la migrazione a:
- **Vercel Postgres** o **Neon** per database PostgreSQL
- **Turso** per SQLite edge-compatibile
- **PlanetScale** per MySQL

## Deploy su Aruba Hosting

Per hosting tradizionale (VPS/dedicato):

```bash
npm run build
npm start
```

Configurare con PM2 per process management:

```bash
pm2 start npm --name "immobiliare" -- start
```

## Struttura Progetto

```
src/
├── app/
│   ├── page.tsx              # Homepage
│   ├── servizi/              # Pagina servizi
│   ├── chi-siamo/            # Chi siamo
│   ├── contatti/             # Form contatti
│   ├── admin/                # Area admin (protetta)
│   │   ├── page.tsx          # Dashboard
│   │   ├── prenotazioni/     # Lista prenotazioni
│   │   └── import-csv/       # Import CSV Airbnb
│   ├── guest/[bookingId]/    # Form registrazione ospiti
│   └── api/                  # API Routes
│       ├── auth/             # Login
│       ├── bookings/         # CRUD prenotazioni
│       ├── guests/           # Gestione ospiti
│       ├── upload-csv/       # Import CSV
│       ├── alloggiati/       # Invio Portale Alloggiati
│       └── contact/          # Richieste contatto
├── components/               # Componenti riutilizzabili
└── lib/                      # Utilities
    ├── db.ts                 # Database SQLite
    ├── auth.ts               # JWT auth
    └── alloggiati.ts         # Integrazione Portale Alloggiati
```

## Portale Alloggiati

L'integrazione supporta due modalità:

1. **Invio automatico via SOAP** (richiede WSKEY configurata)
2. **Generazione file TXT** per upload manuale sul portale

Configurare le credenziali nella sezione admin per abilitare l'invio automatico.
