# Production Deployment Guide

## 1. Supabase Setup

### 1.1 Apply Migrations
1. Go to Supabase Dashboard → SQL Editor
2. Run each migration file in order:
   - `supabase/migrations/20260308_add_project_type.sql`
   - `supabase/migrations/20260309_enable_rls.sql`
   - `supabase/migrations/20260318_add_daily_hours_target.sql`
   - `supabase/migrations/20260318_remove_client_address_notes.sql`

### 1.2 Auth Providers

#### Google OAuth
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://smomxccrabpiflphvjfb.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret
5. In Supabase Dashboard → Authentication → Providers → Google: paste credentials

#### GitHub OAuth
1. Go to GitHub → Settings → Developer settings → OAuth Apps → New
2. Homepage URL: your app URL
3. Callback URL: `https://smomxccrabpiflphvjfb.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret
5. In Supabase Dashboard → Authentication → Providers → GitHub: paste credentials

## 2. Vercel Deploy

1. Push code to GitHub (if not already)
2. Go to vercel.com → New Project → Import your GitHub repo
3. Framework: Vite
4. Environment Variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Deploy!

## 3. Post-Deploy Verification
- [ ] Login with Google works
- [ ] Login with GitHub works
- [ ] Login with email/password works
- [ ] Time entries CRUD works
- [ ] Projects CRUD works
- [ ] Clients CRUD works
- [ ] Reports load correctly
- [ ] Import works
