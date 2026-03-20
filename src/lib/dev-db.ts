/**
 * Dev-only in-memory database backed by localStorage.
 * Seed data is generated on first load and persists across refreshes.
 * Bump DEV_DB_VERSION to reset and re-seed.
 */
import type { Client, Project, TimeEntry, Settings, ProjectWithClient, TimeEntryWithProject } from '@/types/app.types'

const DEV_DB_VERSION = 'v13'
const DEV_USER_ID = 'dev-user-id'

const KEYS = {
  version: 'dev_db_version',
  clients: 'dev_db_clients',
  projects: 'dev_db_projects',
  timeEntries: 'dev_db_time_entries',
  settings: 'dev_db_settings',
}

function uid(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] }
}

function loadOne<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') } catch { return null }
}

function save(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ─── Seed data ─────────────────────────────────────────────────────────────────

function buildSeed() {
  const cAcme = uid(), cTech = uid(), cStudio = uid(), cStartup = uid(), cDesign = uid()
  const pWeb = uid(), pEcom = uid(), pMvp = uid(), pBrand = uid(), pInternal = uid()
  const pMobile = uid(), pBrandId = uid(), pEcomPlat = uid()

  const clients: Client[] = [
    { id: cAcme,    user_id: DEV_USER_ID, name: 'Acme d.o.o.',    color: '#5b8bfc', hourly_rate: 80,   is_active: true, created_at: now(), updated_at: now() },
    { id: cTech,    user_id: DEV_USER_ID, name: 'TechStart',      color: '#b35cf6', hourly_rate: 65,   is_active: true, created_at: now(), updated_at: now() },
    { id: cStudio,  user_id: DEV_USER_ID, name: 'Studio Noir',    color: '#f6b03a', hourly_rate: null, is_active: true, created_at: now(), updated_at: now() },
    { id: cStartup, user_id: DEV_USER_ID, name: 'Startup Hub',    color: '#96c46e', hourly_rate: 55,   is_active: true, created_at: now(), updated_at: now() },
    { id: cDesign,  user_id: DEV_USER_ID, name: 'Design Studio',  color: '#f155ab', hourly_rate: 70,   is_active: true, created_at: now(), updated_at: now() },
  ]

  const projects: Project[] = [
    { id: pWeb,      user_id: DEV_USER_ID, client_id: cAcme,    name: 'Website Redesign',    description: 'Kompletni redizajn web stranice',       is_archived: false, hourly_rate: 80,   estimated_hours: 12,   estimated_amount: null, estimation_type: 'hours', created_at: now(), updated_at: now() },
    { id: pEcom,     user_id: DEV_USER_ID, client_id: cAcme,    name: 'E-commerce',          description: 'Shopify integracija i custom cart',      is_archived: false, hourly_rate: 90,   estimated_hours: null,  estimated_amount: 500,  estimation_type: 'amount', created_at: now(), updated_at: now() },
    { id: pMvp,      user_id: DEV_USER_ID, client_id: cTech,    name: 'MVP razvoj',          description: 'React + Node.js MVP',                    is_archived: false, hourly_rate: 65,   estimated_hours: 20,   estimated_amount: null, estimation_type: 'hours', created_at: now(), updated_at: now() },
    { id: pBrand,    user_id: DEV_USER_ID, client_id: cStudio,  name: 'Brand identitet',     description: 'Logo, boje, tipografija',                is_archived: false, hourly_rate: null, estimated_hours: 4,    estimated_amount: null, estimation_type: 'hours', created_at: now(), updated_at: now() },
    { id: pInternal, user_id: DEV_USER_ID, client_id: null,     name: 'Interni zadaci',      description: null,                                     is_archived: false, hourly_rate: null, estimated_hours: null,  estimated_amount: null, estimation_type: null, created_at: now(), updated_at: now() },
    { id: pMobile,   user_id: DEV_USER_ID, client_id: cStartup, name: 'Mobile App',          description: 'React Native mobile application',        is_archived: false, hourly_rate: 60,   estimated_hours: 40,   estimated_amount: null, estimation_type: 'hours', created_at: now(), updated_at: now() },
    { id: pBrandId,  user_id: DEV_USER_ID, client_id: cDesign,  name: 'Brand Identity',      description: 'Full brand identity package',             is_archived: false, hourly_rate: 75,   estimated_hours: null,  estimated_amount: 1200, estimation_type: 'amount', created_at: now(), updated_at: now() },
    { id: pEcomPlat, user_id: DEV_USER_ID, client_id: cTech,    name: 'E-commerce Platform', description: 'Custom e-commerce platform build',        is_archived: false, hourly_rate: 50,   estimated_hours: 30,   estimated_amount: null, estimation_type: 'hours', created_at: now(), updated_at: now() },
  ]

  const timeEntries: TimeEntry[] = [
    // Today & yesterday
    { id: uid(), user_id: DEV_USER_ID, project_id: pWeb,      description: 'Homepage redesign — hero sekcija',     date: daysAgo(0), duration_minutes: 120, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pMvp,      description: 'API integracija — auth endpoints',     date: daysAgo(0), duration_minutes: 150, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pMobile,   description: 'Navigation setup — React Navigation',  date: daysAgo(0), duration_minutes:  90, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pEcom,     description: 'Implementacija cart-a',                date: daysAgo(1), duration_minutes: 180, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pBrandId,  description: 'Mood board creation',                  date: daysAgo(1), duration_minutes:  60, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    // This week
    { id: uid(), user_id: DEV_USER_ID, project_id: pWeb,      description: 'Klijentski meeting — pregled mockupa', date: daysAgo(2), duration_minutes:  90, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pInternal, description: 'Planiranje sprintova',                 date: daysAgo(2), duration_minutes:  60, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pEcomPlat, description: 'Product catalog API design',           date: daysAgo(3), duration_minutes: 240, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pMobile,   description: 'Authentication screens',               date: daysAgo(3), duration_minutes: 180, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pBrandId,  description: 'Typography exploration',               date: daysAgo(4), duration_minutes: 120, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pWeb,      description: 'Responsive layout fixes',              date: daysAgo(4), duration_minutes:  45, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pMvp,      description: 'Bug fixes — login flow',               date: daysAgo(5), duration_minutes:  90, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pEcomPlat, description: 'Shopping cart implementation',          date: daysAgo(5), duration_minutes: 210, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    // Last week
    { id: uid(), user_id: DEV_USER_ID, project_id: pMvp,      description: 'User authentication — JWT setup',      date: daysAgo(8),  duration_minutes: 120, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pEcom,     description: 'Checkout flow i payment gateway',      date: daysAgo(9),  duration_minutes: 150, is_paid: false, is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pWeb,      description: 'Dizajn mockupi — inner pages',         date: daysAgo(10), duration_minutes: 180, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pMvp,      description: 'Backend setup — Express + PostgreSQL', date: daysAgo(11), duration_minutes: 240, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pBrand,    description: 'Logo dizajn — finalizacija',           date: daysAgo(11), duration_minutes: 120, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pMobile,   description: 'Push notification setup',              date: daysAgo(8),  duration_minutes: 150, is_paid: false, is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pBrandId,  description: 'Logo concepts — round 1',              date: daysAgo(9),  duration_minutes: 180, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pEcomPlat, description: 'Payment gateway integration',          date: daysAgo(10), duration_minutes: 300, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pInternal, description: 'Team standup & planning',              date: daysAgo(8),  duration_minutes:  30, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pMobile,   description: 'UX research — user interviews',        date: daysAgo(12), duration_minutes: 120, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    // Two weeks ago
    { id: uid(), user_id: DEV_USER_ID, project_id: pMvp,      description: 'Database schema i migracije',          date: daysAgo(15), duration_minutes: 180, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pMvp,      description: 'Product backlog i user stories',       date: daysAgo(16), duration_minutes:  90, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pBrand,    description: 'Color palette i tipografija',          date: daysAgo(17), duration_minutes:  60, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pInternal, description: 'Analiza konkurencije',                 date: daysAgo(18), duration_minutes:  90, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pWeb,      description: 'Wireframing — svi screeni',            date: daysAgo(19), duration_minutes: 180, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pEcomPlat, description: 'Database design — ERD diagram',        date: daysAgo(15), duration_minutes: 120, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pMobile,   description: 'Wireframes — main user flows',         date: daysAgo(16), duration_minutes: 240, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pBrandId,  description: 'Competitive analysis — brand audit',   date: daysAgo(17), duration_minutes:  90, is_paid: false, is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pEcom,     description: 'Product page template design',         date: daysAgo(18), duration_minutes: 150, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pInternal, description: 'Invoice template creation',            date: daysAgo(19), duration_minutes:  45, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    // Three weeks ago
    { id: uid(), user_id: DEV_USER_ID, project_id: pMvp,      description: 'Technical architecture planning',      date: daysAgo(22), duration_minutes: 180, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pWeb,      description: 'Content strategy meeting',             date: daysAgo(22), duration_minutes:  60, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pMobile,   description: 'App architecture — state management',  date: daysAgo(23), duration_minutes: 210, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pBrandId,  description: 'Client kickoff meeting',               date: daysAgo(23), duration_minutes:  90, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pEcomPlat, description: 'Requirements gathering',               date: daysAgo(24), duration_minutes: 120, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pBrand,    description: 'Brand workshop — discovery session',   date: daysAgo(24), duration_minutes: 180, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pInternal, description: 'Monthly bookkeeping',                  date: daysAgo(25), duration_minutes:  60, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pEcom,     description: 'Shopify theme customization',          date: daysAgo(25), duration_minutes: 240, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pMvp,      description: 'CI/CD pipeline setup',                 date: daysAgo(26), duration_minutes: 150, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    // Four weeks ago
    { id: uid(), user_id: DEV_USER_ID, project_id: pWeb,      description: 'Stakeholder interviews',               date: daysAgo(28), duration_minutes:  90, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pMobile,   description: 'Project kickoff & scoping',            date: daysAgo(28), duration_minutes: 120, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pEcomPlat, description: 'Competitor platform analysis',         date: daysAgo(29), duration_minutes: 180, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pBrandId,  description: 'Design system foundations',            date: daysAgo(29), duration_minutes: 150, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pMvp,      description: 'Initial project setup & tooling',      date: daysAgo(30), duration_minutes: 120, is_paid: true,  is_invoiced: true,  created_at: now(), updated_at: now() },
    { id: uid(), user_id: DEV_USER_ID, project_id: pInternal, description: 'Client proposal drafting',             date: daysAgo(30), duration_minutes:  90, is_paid: false, is_invoiced: false, created_at: now(), updated_at: now() },
  ]

  const settings: Settings = {
    id: uid(),
    user_id: DEV_USER_ID,
    company_name: 'Dev Studio',
    company_address: 'Ilica 42',
    company_city: 'Zagreb',
    company_zip: '10000',
    company_country: 'Croatia',
    company_vat_id: 'HR12345678901',
    default_hourly_rate: 75,
    rounding_mode: 'none',
    daily_hours_target: 8,
    onboarding_completed: true,
    created_at: now(),
    updated_at: now(),
  }

  return { clients, projects, timeEntries, settings }
}

function init() {
  if (localStorage.getItem(KEYS.version) === DEV_DB_VERSION) return
  const seed = buildSeed()
  save(KEYS.clients, seed.clients)
  save(KEYS.projects, seed.projects)
  save(KEYS.timeEntries, seed.timeEntries)
  save(KEYS.settings, seed.settings)
  localStorage.setItem(KEYS.version, DEV_DB_VERSION)
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export function devGetClients(): Client[] {
  return load<Client>(KEYS.clients).sort((a, b) => a.name.localeCompare(b.name))
}

export function devCreateClient(data: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Client {
  const clients = load<Client>(KEYS.clients)
  const client: Client = { ...data, id: uid(), created_at: now(), updated_at: now() }
  save(KEYS.clients, [...clients, client])
  return client
}

export function devUpdateClient(id: string, updates: Partial<Client>): void {
  const clients = load<Client>(KEYS.clients).map(c =>
    c.id === id ? { ...c, ...updates, updated_at: now() } : c
  )
  save(KEYS.clients, clients)
}

export function devDeleteClient(id: string, cascade = false): void {
  if (cascade) {
    const projects = load<Project>(KEYS.projects).filter(p => p.client_id === id)
    const projectIds = new Set(projects.map(p => p.id))
    // Delete time entries belonging to this client's projects
    save(KEYS.timeEntries, load<TimeEntry>(KEYS.timeEntries).filter(e => !e.project_id || !projectIds.has(e.project_id)))
    // Delete the projects
    save(KEYS.projects, load<Project>(KEYS.projects).filter(p => p.client_id !== id))
  } else {
    // Nullify client_id on projects so they become unassigned
    save(KEYS.projects, load<Project>(KEYS.projects).map(p =>
      p.client_id === id ? { ...p, client_id: null, updated_at: now() } : p
    ))
  }
  save(KEYS.clients, load<Client>(KEYS.clients).filter(c => c.id !== id))
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export function devGetProjects(): ProjectWithClient[] {
  const projects = load<Project>(KEYS.projects).sort((a, b) => a.name.localeCompare(b.name))
  const clients = devGetClients()
  return projects.map(p => ({
    ...p,
    client: clients.find(c => c.id === p.client_id) ?? null,
  }))
}

export function devCreateProject(data: Omit<Project, 'id' | 'created_at' | 'updated_at'>): ProjectWithClient {
  const projects = load<Project>(KEYS.projects)
  const project: Project = { ...data, id: uid(), created_at: now(), updated_at: now() }
  save(KEYS.projects, [...projects, project])
  const clients = devGetClients()
  return { ...project, client: clients.find(c => c.id === project.client_id) ?? null }
}

export function devUpdateProject(id: string, updates: Partial<Project>): void {
  const projects = load<Project>(KEYS.projects).map(p =>
    p.id === id ? { ...p, ...updates, updated_at: now() } : p
  )
  save(KEYS.projects, projects)
}

export function devDeleteProject(id: string): void {
  save(KEYS.projects, load<Project>(KEYS.projects).filter(p => p.id !== id))
}

export function devGetProjectLoggedMinutes(): Map<string, number> {
  const entries = load<TimeEntry>(KEYS.timeEntries)
  const map = new Map<string, number>()
  for (const e of entries) {
    if (e.project_id) {
      map.set(e.project_id, (map.get(e.project_id) ?? 0) + e.duration_minutes)
    }
  }
  return map
}

// ─── Time entries ─────────────────────────────────────────────────────────────

export interface DevFetchOptions {
  startDate?: string
  endDate?: string
  projectId?: string
  isPaid?: boolean
  isInvoiced?: boolean
  limit?: number
  offset?: number
}

export function devGetTimeEntries(options: DevFetchOptions = {}): TimeEntryWithProject[] {
  let entries = load<TimeEntry>(KEYS.timeEntries)
  const projects = devGetProjects()

  if (options.startDate) entries = entries.filter(e => e.date >= options.startDate!)
  if (options.endDate)   entries = entries.filter(e => e.date <= options.endDate!)
  if (options.projectId) entries = entries.filter(e => e.project_id === options.projectId)
  if (options.isPaid !== undefined)     entries = entries.filter(e => e.is_paid === options.isPaid)
  if (options.isInvoiced !== undefined) entries = entries.filter(e => e.is_invoiced === options.isInvoiced)

  let sorted = entries
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))

  if (options.offset) sorted = sorted.slice(options.offset)
  if (options.limit) sorted = sorted.slice(0, options.limit)

  return sorted.map(e => ({
      ...e,
      project: projects.find(p => p.id === e.project_id) ?? null,
    }))
}

export function devCreateTimeEntry(data: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>): TimeEntryWithProject {
  const entries = load<TimeEntry>(KEYS.timeEntries)
  const entry: TimeEntry = { ...data, id: uid(), created_at: now(), updated_at: now() }
  save(KEYS.timeEntries, [...entries, entry])
  const projects = devGetProjects()
  return { ...entry, project: projects.find(p => p.id === entry.project_id) ?? null }
}

export function devUpdateTimeEntry(id: string, updates: Partial<TimeEntry>): TimeEntryWithProject {
  const entries = load<TimeEntry>(KEYS.timeEntries).map(e =>
    e.id === id ? { ...e, ...updates, updated_at: now() } : e
  )
  save(KEYS.timeEntries, entries)
  const updated = entries.find(e => e.id === id)!
  const projects = devGetProjects()
  return { ...updated, project: projects.find(p => p.id === updated.project_id) ?? null }
}

export function devDeleteTimeEntry(id: string): void {
  save(KEYS.timeEntries, load<TimeEntry>(KEYS.timeEntries).filter(e => e.id !== id))
}

export function devBulkImportTimeEntries(
  entries: Array<{
    project_id: string | null
    description: string
    date: string
    duration_minutes: number
    is_paid: boolean
    is_invoiced: boolean
  }>
): void {
  const existing = load<TimeEntry>(KEYS.timeEntries)
  const newEntries: TimeEntry[] = entries.map(e => ({
    ...e,
    id: uid(),
    user_id: DEV_USER_ID,
    created_at: now(),
    updated_at: now(),
  }))
  save(KEYS.timeEntries, [...existing, ...newEntries])
}

export function devBulkUpdateTimeEntries(ids: string[], updates: Partial<TimeEntry>): void {
  const entries = load<TimeEntry>(KEYS.timeEntries).map(e =>
    ids.includes(e.id) ? { ...e, ...updates, updated_at: now() } : e
  )
  save(KEYS.timeEntries, entries)
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function devGetSettings(): Settings {
  return loadOne<Settings>(KEYS.settings)!
}

export function devUpdateSettings(updates: Partial<Settings>): Settings {
  const current = devGetSettings()
  const updated = { ...current, ...updates, updated_at: now() }
  save(KEYS.settings, updated)
  return updated
}

// ─── Init (runs on import) ────────────────────────────────────────────────────

init()
