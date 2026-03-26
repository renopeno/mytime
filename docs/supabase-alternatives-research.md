# Supabase Alternative Research - MyTimeTracker

## Zašto migracija?

Supabase pauzira free-tier projekte zbog "male aktivnosti" i forsira Pro plan ($25/mj).
Trebamo free alternativu koja neće pauzirati projekt i koja omogućuje relativno jednostavnu migraciju.

**Zahtjevi:** Managed cloud (bez self-hostinga), ostati na PostgreSQL. Budžet: do ~2 EUR/mj je OK ako je bolje od free opcija.

## Trenutno korištenje Supabase-a

| Feature | Koristi se | Detalji |
|---------|-----------|---------|
| Auth | Da | Email/password + Google OAuth + GitHub OAuth |
| PostgreSQL | Da | 5 tablica, FK relacije, joinovi |
| RLS | Da | Sve tablice filtrirane po `auth.uid()` |
| RPC | Da | 1 funkcija (`get_project_logged_minutes`) |
| Storage | Ne | - |
| Realtime | Ne | - |
| Edge Functions | Ne | - |

**Arhitektura:** React 19 SPA (Vite) → direktno u Supabase iz browsera. Svi pozivi su u custom hookovima.

---

## Opcija 1: Neon (PostgreSQL) + Clerk (Auth) — PREPORUČENO

### Neon (baza)
- **Free tier:** 0.5 GB storage, 190 compute hours/mj, neograničeni projekti
- **Pauziranje:** Neon pauzira compute nakon 5 min neaktivnosti (cold start ~1-2s), ali **NE briše projekt**
- **PostgreSQL kompatibilnost:** 100% - ista baza, isti SQL, iste migracije
- **Serverless driver:** Neon ima HTTP/WebSocket driver za direct-from-browser pristup

### Clerk (auth)
- **Free tier:** 10,000 MAU besplatno (više nego dovoljno)
- **OAuth:** Google, GitHub, i 20+ drugih providera out-of-the-box
- **React SDK:** `@clerk/clerk-react` - odličan DX, gotov `<SignIn/>`, `<UserButton/>` itd.
- **JWT Templates:** Može generirati custom JWT-ove koje Neon RLS može verifyati

### Migracija
- **Effort:** SREDNJI
- Baza: `pg_dump` iz Supabase → `pg_restore` u Neon (direktan PostgreSQL transfer)
- Auth: Zamijeniti `AuthContext` s Clerk providerom, koristiti Clerk React hooks
- Data access: Dodati thin API layer (Hono/Express na Vercel Serverless) jer Neon nema built-in RLS poput Supabase-a — ili koristiti Neon Authorize s Clerk JWT za RLS
- Hookovi: Prepraviti da koriste API umjesto `supabase.from().select()`

### Pros/Cons
- ✅ PostgreSQL — nula migracije sheme, iste migracije rade
- ✅ Clerk je best-in-class za auth DX
- ✅ Oba servisa imaju izdašne free tierove bez pauziranja projekta
- ✅ Neon aktivno raste, VC-backed
- ⚠️ Treba API layer (Vercel serverless) jer nema direktan browser→DB pristup s RLS-om
- ⚠️ Dva servisa umjesto jednog (više konfiguracije)

---

## Opcija 2: Neon + Auth.js (NextAuth) — ALTERNATIVA

Isto kao Opcija 1, ali s Auth.js umjesto Clerka:
- **Besplatno:** Auth.js je open-source, nema limita
- **Cons:** Zahtijeva server-side (Vercel serverless), više manualne konfiguracije
- **OAuth:** Google, GitHub podržani
- **DX:** Slabiji od Clerka, ali potpuno besplatno bez ikakvih limita

---

## Opcija 3: Xata (PostgreSQL-based)

- **Free tier:** 15 GB storage, 75 requests/sec
- **PostgreSQL wire protocol:** Da, kompatibilan
- **Auth:** Nema — treba external (Clerk, Auth.js)
- **Pauziranje:** Ne pauzira projekte
- **Problem:** Xata dodaje svoj sloj iznad PostgreSQL-a, nije čisti PostgreSQL
- **Verdict:** Solidna opcija, ali manje mature od Neona

---

## Opcija 4: CockroachDB Serverless

- **Free tier:** 10 GB storage, 50M Request Units/mj
- **PostgreSQL kompatibilnost:** ~95% (wire-compatible, ali nije isti engine)
- **Auth:** Nema — treba external
- **Pauziranje:** Ne briše, ali throttla nakon limita
- **Problem:** Neke PostgreSQL specifičnosti mogu ne raditi identično
- **Verdict:** Moguće, ali Neon je bliži čistom PostgreSQL-u

---

## Opcije koje NE preporučujem

| Opcija | Razlog |
|--------|--------|
| **Firebase** | NoSQL (Firestore) — kompletni rewrite data layera |
| **PocketBase** | Self-hosted + SQLite |
| **Turso** | SQLite — ne PostgreSQL |
| **Convex** | Custom baza, vendor lock-in još gori od Supabase |
| **Appwrite Cloud** | MariaDB under the hood, ne PostgreSQL |
| **Railway** | Free tier ukinut ($5/mj minimum) |

---

## Preporučeni plan migracije: Neon + Clerk

### Korak 1: Setup infrastrukture
- Kreirati Neon account + projekt (free tier)
- Kreirati Clerk account + aplikaciju (free tier)
- Konfigurirati OAuth providere (Google, GitHub) u Clerku

### Korak 2: API layer (Vercel Serverless)
- Dodati `/api` route-ove koristeći Hono na Vercel Serverless Functions
- Svaki endpoint verificira Clerk JWT i queryja Neon
- Alternativa: koristiti Neon Authorize s Clerk JWT za RLS na bazi

### Korak 3: Migracija baze
- `pg_dump` iz Supabase → `pg_restore` u Neon
- Testirati sve querije

### Korak 4: Migracija auth-a
- Zamijeniti `AuthContext` s `<ClerkProvider>`
- Zamijeniti login page s Clerk komponentama
- User migration: Clerk ima import API za postojeće usere

### Korak 5: Prepraviti data hookove
- `useTimeEntries`, `useProjects`, `useClients`, `useSettings` → pozivaju API umjesto Supabase SDK
- Može se koristiti `fetch()` ili `ky`/`ofetch` library

### Korak 6: Testiranje i deploy
- Testirati sve CRUD operacije
- Testirati auth flow (login, signup, OAuth)
- Deploy na Vercel

---

## Ključni fajlovi za migraciju

| Fajl | Promjena |
|------|----------|
| `src/lib/supabase.ts` | Zamijeniti s Neon/API client konfiguracijom |
| `src/contexts/AuthContext.tsx` | Zamijeniti s Clerk providerom |
| `src/hooks/useTimeEntries.ts` | API pozivi umjesto Supabase SDK |
| `src/hooks/useProjects.ts` | API pozivi umjesto Supabase SDK |
| `src/hooks/useClients.ts` | API pozivi umjesto Supabase SDK |
| `src/hooks/useSettings.ts` | API pozivi umjesto Supabase SDK |
| `src/hooks/useDashboardData.ts` | API pozivi umjesto Supabase SDK |
| `src/hooks/useProjectProgress.ts` | API pozivi (zamjena za RPC) |
| `src/pages/LoginPage.tsx` | Clerk komponente |
| `package.json` | Dodati `@clerk/clerk-react`, `hono`, maknuti `@supabase/supabase-js` |
| `api/` (novo) | Vercel serverless API routes |

---

## Odluka: Ostajemo na Supabase + cron keep-alive

### Zašto ne migrirati?

Nakon analize budućih potreba projekta (logo upload za fakture, email slanje, realtime timer, team features), Supabase sve to već ima uključeno (Storage, Edge Functions, Realtime). Svaki novi feature s Neon stackom zahtijeva dodavanje novih servisa.

### Implementirano rješenje

GitHub Actions cron job (`.github/workflows/supabase-keep-alive.yml`) koji 2x tjedno šalje request na Supabase bazu i drži projekt aktivnim.

### Setup (jednom)

Dodaj ova dva GitHub repository secrets (Settings → Secrets → Actions):
- `SUPABASE_URL` — tvoj Supabase project URL
- `SUPABASE_ANON_KEY` — tvoj Supabase anon key

### Backup plan

Ako Supabase promijeni politiku i cron prestane raditi → migracija na Neon + Clerk (dokumentirano gore).
