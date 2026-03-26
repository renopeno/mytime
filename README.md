# MyTimeTracker

Time tracking and invoicing app for freelancers. Track hours, manage clients and projects, generate reports and PDF invoices.

Built with React 19, TypeScript, Vite, Tailwind CSS v4, and Supabase.

## Quick Start

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`. In dev mode, it uses an **in-memory localStorage database** with seeded test data — no Supabase connection needed.

## Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

In dev mode (`npm run dev`), these are optional — the app falls back to mock data automatically.

## Supabase Keep-Alive

> **Important:** Supabase pauses free-tier projects after 7 days of inactivity.

A GitHub Actions cron job (`.github/workflows/supabase-keep-alive.yml`) pings the database twice a week to prevent this. To activate it, add these **GitHub repository secrets** (Settings → Secrets → Actions):

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_ANON_KEY` — your Supabase anon key

You can manually trigger it from the Actions tab to verify it works.

## Project Structure

```
src/
├── pages/                 # Route pages (lazy-loaded)
│   ├── TimeEntriesPage    # Main view — log and manage time entries
│   ├── ProjectsPage       # Project CRUD with estimation tracking
│   ├── ClientsPage        # Client management with color coding
│   ├── InvoicingPage      # Billing status tracking, bulk mark paid/invoiced
│   ├── ReportsPage        # Charts, KPIs, date comparisons, PDF export
│   ├── SettingsPage       # Company info, rates, import/export
│   └── LoginPage          # Email/password + Google/GitHub OAuth
│
├── hooks/                 # Data fetching — all Supabase calls live here
│   ├── useTimeEntries     # Time entry CRUD + filtering
│   ├── useProjects        # Project CRUD + archiving
│   ├── useClients         # Client CRUD + cascade delete
│   ├── useSettings        # User settings fetch/update
│   ├── useDashboardData   # Aggregated billing/project/client stats
│   └── useProjectProgress # RPC-based estimation progress
│
├── contexts/
│   └── AuthContext        # Auth wrapper (Supabase auth + dev-mode bypass)
│
├── components/
│   ├── ui/                # Base UI components (button, dialog, input, etc.)
│   ├── layout/            # AppLayout, Sidebar
│   ├── time-entries/      # Time entry forms, lists, duration input
│   ├── projects/          # Project forms, lists, selectors
│   ├── clients/           # Client forms, lists
│   ├── import/            # CSV import wizard (Toggl, Clockify, Harvest)
│   └── settings/          # Settings form
│
├── lib/                   # Utilities
│   ├── supabase.ts        # Supabase client init
│   ├── dev-db.ts          # In-memory dev database (localStorage-backed)
│   ├── csv-import.ts      # CSV parsing with auto-format detection
│   ├── csv-export.ts      # CSV export with UTF-8 BOM
│   ├── pdf-report.tsx     # PDF generation (@react-pdf/renderer)
│   ├── duration.ts        # Duration parsing (H:MM, H:MM:SS, decimal)
│   ├── rate.ts            # Rate resolution (project → client → default)
│   ├── color-registry.ts  # Design system color tracking
│   └── format.ts          # Date/currency formatting
│
├── types/
│   ├── app.types.ts       # Domain types (Client, Project, TimeEntry, etc.)
│   └── database.types.ts  # Auto-generated Supabase types
│
└── index.css              # Tailwind theme tokens + design system
```

## Database Schema

5 tables, all with Row Level Security (users can only access their own data):

- **profiles** — user profile (name, avatar), linked to Supabase auth
- **settings** — company info, default hourly rate, daily hours target
- **clients** — name, color, per-client hourly rate, active/inactive
- **projects** — linked to client, estimation (hours or amount), project type
- **time_entries** — date, duration, project, billing status (paid/invoiced)

Migrations are in `supabase/migrations/` — apply them in order via Supabase SQL Editor or `supabase db push`.

## Key Patterns

### Data hooks

Every hook supports both production (Supabase) and dev mode (localStorage):

```typescript
// Dev mode: devGetTimeEntries() from dev-db.ts
// Prod mode: supabase.from('time_entries').select('*, project:projects(*)')
```

To add a new data operation, update the relevant hook and its dev-db counterpart.

### Rate resolution

Hourly rate follows a precedence chain: **project rate → client rate → default rate** (from settings). See `src/lib/rate.ts`.

### Forms

All forms use React Hook Form + Zod validation. Pattern: define Zod schema → `useForm` with `zodResolver` → submit handler calls hook CRUD function.

### Color registry

When adding hardcoded colors to components, register them in `src/lib/color-registry.ts`. See `CLAUDE.md` for the full protocol.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with HMR (port 5173) |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check |

## Tech Stack

| Category | Tech |
|----------|------|
| Framework | React 19, React Router 7, TypeScript 5.9 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4, shadcn/ui components |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| PDF | @react-pdf/renderer |
| Icons | Lucide React |
| Fonts | Inter Variable, PP Editorial New |
| Deploy | Vercel |

## Deployment

See `DEPLOY.md` for the full production deployment guide (Supabase setup, OAuth providers, Vercel config, post-deploy checklist).

## CSV Import/Export

**Import** supports auto-detection of Toggl, Clockify, and Harvest formats, plus generic CSV. The wizard handles column mapping, duration parsing (H:MM:SS, H:MM, decimal), date normalization, and billing status from tags.

**Export** generates CSV with UTF-8 BOM (Excel-compatible) including duration in both H:MM and decimal formats.

## Dev Mode

When running `npm run dev`, the app automatically:
- Bypasses Supabase auth with a mock user
- Uses localStorage as an in-memory database
- Seeds test data (5 clients, 8 projects, 50+ time entries)
- Requires zero external services

Bump `DEV_DB_VERSION` in `src/lib/dev-db.ts` to force a re-seed of test data.
