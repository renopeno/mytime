# MyTimeTracker v1.0 — Design Document

**Date:** 2026-03-18
**Status:** Approved

## Scope Overview

Four work blocks for v1.0:

| # | Block | Description |
|---|-------|-------------|
| 1 | Import sustav | Smart CSV parser + wizard za migraciju s Toggla i drugih alata |
| 2 | Reporting redizajn | Novi date picker, filteri, compare, smart grouping, PDF export |
| 3 | Produkcijski deploy | Supabase migracije, Vercel deploy, auth provideri |
| 4 | Polish | Login page dizajn, mobile responsiveness, cleanup |

### Out of Scope (v1.0)

- Rounding mode
- Saved/custom reporti
- Multi-user / team features
- Invoice generiranje (PDF faktura)
- API integracije
- Custom domena (riješit ćemo naknadno)

---

## 1. Import Sustav

### Wizard — 4 koraka

#### Korak 1: Upload

- Drag & drop zona + file picker
- Prihvaća `.csv` fileove

#### Korak 2: Auto-detect & Preview

- Parsiramo header row, matchamo na poznate stupce
- Ako prepoznamo format → "Izgleda kao Toggl export ✓"
- Preview: prvih 5 redova
- Tag scanning: tražimo poznate billing tagove (`paid`, `not paid`, `unpaid`, `invoiced`, `invoice sent`, `billed`). Ako nađemo → automatski mapiramo na `is_paid` / `is_invoiced`. Ostali tagovi → `#tag` u description

#### Korak 3: Klijenti & Projekti tablica

Tablica s unikatnim klijentima i projektima iz CSV-a:

| Klijent | Projekt | Izračunata satnica | Ukupni sati | Ukupna zarada | Akcija |
|---------|---------|-------------------|-------------|---------------|--------|
| Acme Corp | Website Redesign | €50/h | 124h | €6.200 | Kreiraj / Mapira na postojeći |

- Satnica auto-calculated: `amount / hours` gdje imamo podatke
- Gdje nemamo amount (npr. Toggl) — satnica prazna, inline editable
- "Mapira na postojeći" → dropdown s postojećim klijentima/projektima
- Sve ćelije inline editable klikom

#### Korak 4: Import

- Summary: "Importat će se X entryja za Y projekata i Z klijenata"
- Klik "Import" → gotovo
- Toast: "Uspješno importano X entryja"

### Auto-detect mapiranje stupaca

```
date / start date       → date
description / notes     → description
project                 → project_id (lookup/create)
client                  → client_id (lookup/create)
duration / hours        → duration_minutes
tags                    → billing status + #ostalo u description
billable amount         → za izračun rate-a
billable / billable rate → za izračun rate-a
```

### Filozofija

Automatiziraj maksimalno. Što ne možemo saznati iz CSV-a ostaje prazno — user dopuni naknadno kad mu treba. Nema prisilnog ručnog unosa u wizardu.

### Polja koja ne možemo saznati iz exporta

| Naše polje | Pristup |
|------------|---------|
| Project color | Auto-assign |
| Project type | Ostaje unset |
| Project estimated_hours | Ostaje prazno |
| Hourly rate (kad nema amount) | Prazno, inline editable |

---

## 2. Reporting Redizajn

### Date Picker — combo komponenta (jedan popover)

```
┌──────────────────────────────────────────────────────┐
│  Presets           │  ◀ Ožujak 2026 ▸  Travanj 2026 ▶│
│                    │                                  │
│  Today             │  Po Ut Sr Če Pe Su Ne  │  Po ... │
│  This Week         │  [dva kalendara side-by-side]    │
│  Last Week         │  za custom range selection       │
│  This Month        │                                  │
│  Last Month        │                                  │
│  This Year         │                                  │
│  Last Year         │                                  │
│  All Time          │                                  │
└──────────────────────────────────────────────────────┘
```

- Lijevo: preset lista, klik = odmah primijeni
- Desno: dva kalendara **side-by-side** za custom range
- Referenca: Toggl date picker stil

### Filteri (ispod date pickera, u redu)

- **Projekt** — multi-select dropdown
- **Klijent** — multi-select dropdown
- **Billing status** — segment control: All / Not Paid / Invoice Sent / Paid
- **Compare** — gumb koji otvara drugi date picker (isti format: preseti + dva kalendara) za odabir perioda za usporedbu

### KPI kartice

| Ukupni sati | Ukupna zarada | Radni dani | Billing breakdown |
|-------------|---------------|------------|-------------------|
| 142h 30min | €8.540 | 18 dana | Horizontalni stacked bar: not paid · invoice sent · paid |

- **Billing breakdown** kao horizontalni stacked bar s bojama i iznosima
- **Radni dani** = unikatni datumi s barem jednim entryjem
- **Compare mode**: KPI kartice dobiju delta prikaz (npr. `142h ↑12%`)

### Chartovi

#### Widget 1: By Project | By Client

- Jedan widget sa **segment control**: `By Project` | `By Client`
- Horizontalni bar chart
- Prikazuje zaradu

#### Widget 2: Trend

- **Segment control**: `Sati` | `Zarada`
- Area/line chart
- **Smart grouping prema rasponu:**

| Raspon | Grupiranje | Primjer |
|--------|-----------|---------|
| ≤ 14 dana | Daily | This Week → Po, Ut, Sr... |
| 15–90 dana | Weekly | This Month → W1, W2, W3, W4 |
| > 90 dana | Monthly | This Year → Sij, Velj, Ožu... |

#### Compare Mode (kad je aktivan)

- KPI kartice: delta prikaz (↑/↓ postotak)
- Trend chart: druga linija (dashed, druga boja) za compare period
- Bar chart: grouped bars (current vs compare, dvije boje)

### PDF Export

- Gumb "Export PDF" u headeru reporta
- Generira PDF snapshot trenutnog pogleda:
  - Naslov s periodom i aktivnim filterima
  - KPI kartice
  - Chartovi
  - Detaljna tablica ispod

### Time Log

- Izbacujemo kao tab iz Reports
- Vraćamo kao zasebnu stranicu u sidebaru ako bude potreba

---

## 3. Produkcijski Deploy

### Supabase migracije

- Pokrenuti postojeće: `add_project_type`, `enable_rls`
- Nova migracija: `add_daily_hours_target` na settings tablicu
- RLS policije: svaki user vidi samo svoje podatke

### Vercel

- Connect GitHub repo → Vercel
- Build: `npm run build`
- Auto-deploy na push to main
- Za sad: `*.vercel.app` subdomena

### Auth provideri (Supabase dashboard)

- Google OAuth → treba Google Cloud Console credentials
- GitHub OAuth → treba GitHub OAuth App
- Email/password → već podržano

### Upute za usera

Detaljne step-by-step instrukcije za svaki korak koji zahtijeva manual setup (OAuth credentials, env varijable, Supabase dashboard config).

---

## 4. Polish

### Login Page

- Čist, profesionalan look koji paše uz ostatak interfacea
- Malo otkačeniji — kreativnija tipografija, boje
- Logo + kratki tagline
- Email/password forma + OAuth gumbi (Google, GitHub)
- Responsive
- Marketing page s animacijama i kreativnijim pristupom dolazi kasnije, ali login može nagovijestiti taj smjer

### Mobile Responsiveness

- **Sidebar** → hamburger menu
- **Tablice** → čitljivi card layout (konzistentan across stranica — naslovi, akcije na istim pozicijama)
- **Margine**: ~20px lijevo i desno na mobileu
- **Reports**: chartovi full-width, stacked vertikalno
- **Import wizard**: single column layout
- **Forme**: full-width inputi

### Cleanup

- Izbaciti `client.address` polje iz app-a
- Izbaciti `client.notes` polje iz app-a
- Izbaciti rounding mode iz settings UI-a (nije implementirano, ne treba za v1.0)
