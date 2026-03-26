# MyTimeTracker — Development Instructions

## README

Always keep the `README.md` up to date when making structural changes (new pages, new hooks, new tools, dependency changes). The README is the primary onboarding document.

## Architecture Rules

### Data layer
- All Supabase calls go through hooks in `src/hooks/`. Never call `supabase.from()` directly in components.
- Every hook must support dev mode — add corresponding `dev*` functions in `src/lib/dev-db.ts`.
- When adding a new database table, also update `src/types/database.types.ts` and `src/types/app.types.ts`.

### Rate resolution
- Hourly rate precedence: project → client → settings default. Use `resolveHourlyRate()` from `src/lib/rate.ts`. Never hardcode rate logic in components.

### Forms
- Use React Hook Form + Zod for all forms. Define the Zod schema first, derive the TypeScript type from it.
- Form components live alongside their page (e.g., `components/projects/ProjectForm.tsx`).

### Components
- UI primitives go in `components/ui/`. Feature components go in their feature folder (e.g., `components/time-entries/`).
- Use Tailwind classes. Avoid inline styles except for dynamic values (e.g., `style={{ backgroundColor: client.color }}`).

### Routing
- All page components are lazy-loaded in `App.tsx`. New pages should follow the same pattern.

## Color Registry

When adding a new color (hex, rgb, oklch) to any component:
1. Add an entry to `src/lib/color-registry.ts`
2. If the color uses an existing CSS variable → status: "tokenized"
3. If the color is hardcoded → status: "unresolved"
4. Set the correct category, label, and usedIn fields

When tokenizing a previously hardcoded color:
1. Add the CSS variable to `src/index.css` (both light and dark mode)
2. Add the Tailwind mapping in the `@theme inline` block
3. Replace hardcoded values in components with the token
4. Update the registry entry: set token, tailwindClass, status: "tokenized"

## Commit Conventions

Use conventional commits: `feat:`, `fix:`, `style:`, `refactor:`, `chore:`, `docs:`. Lowercase, imperative mood, concise.

## Supabase

- Free tier pauses after 7 days inactivity — keep-alive cron job is in `.github/workflows/supabase-keep-alive.yml`
- RLS is enabled on all tables — every query is automatically filtered by `auth.uid()`
- Migrations live in `supabase/migrations/` — apply in order via SQL Editor or `supabase db push`
- Never expose the service role key in client code. Only use the anon key.
