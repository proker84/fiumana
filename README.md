# Immobiliare Fiumana – Monorepo

Sito web premium + API NestJS per gestione immobiliare, portfolio e affitti brevi. Stack: Next.js (App Router), Tailwind, Framer Motion, NestJS, Prisma, PostgreSQL.

## Requisiti
- Node.js 20+
- pnpm 9+
- Docker (per Postgres locale)

## Avvio rapido (macOS)

1) Avvia Postgres
```bash
docker compose up -d
```

2) Installa dipendenze
```bash
pnpm install
```

3) Configura env
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

4) Prisma
```bash
pnpm -C apps/api prisma:generate
pnpm -C apps/api prisma:migrate
pnpm -C apps/api seed
```

5) Avvia in dev
```bash
pnpm dev:web
pnpm dev:api
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/api/docs`

## Note UX/UI
- Dark mode di default con accenti cyan/teal
- Glassmorphism e gradienti
- Animazioni Framer Motion
- Hero supporta video `public/hero-video.mp4` (opzionale). Se non presente usa il poster immagine.

## Funzionalità backend
- Auth JWT + refresh token (admin)
- CRUD immobili e blog
- Lead pubblici con rate limit
- Upload media con Cloudinary (fallback locale)
- Swagger/OpenAPI

## Endpoint principali
- `GET /api/properties` (filtri & pagination)
- `GET /api/properties/:id`
- `POST /api/admin/properties`
- `POST /api/leads`
- `GET /api/posts`
- `POST /api/admin/posts`
- `POST /api/admin/media/upload`

## Variabili ambiente
### `apps/api/.env`
- `DATABASE_URL` (Postgres)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `CLOUDINARY_*`

### `apps/web/.env.local`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_MAPBOX_TOKEN` (opzionale)

## Seed
Il seed crea:
- Admin: `admin@immobiliarefiumana.it` / `Admin123!`
- 5 immobili demo (2 residenziali, 2 commerciali, 1 vacanza)

## Scripts utili
```bash
pnpm lint
pnpm typecheck
pnpm -C apps/api test
```
