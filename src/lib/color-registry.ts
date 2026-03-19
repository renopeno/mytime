export type ColorStatus = 'tokenized' | 'unresolved'

export type ColorCategory =
  | 'primitive-neutral'
  | 'primitive-green'
  | 'core'           // layer 2: semantic tokens referencing primitives
  | 'status'
  | 'chart'
  | 'client-palette'
  | 'progress'
  | 'pdf'

export type ColorEntry = {
  id: string
  value: string
  token: string | null
  tailwindClass: string | null
  primitive: string | null // which primitive this references, e.g. "neutral-10"
  category: ColorCategory
  label: string
  usedIn: string[]
  status: ColorStatus
}

export const colorRegistry: ColorEntry[] = [
  // ─── Neutral Scale ─────────────────────────────────────────────────────
  {
    id: 'neutral-10',
    value: '#f9f4ef',
    token: '--neutral-10',
    tailwindClass: 'neutral-10',
    primitive: null,
    category: 'primitive-neutral',
    label: 'Neutral 10',
    usedIn: ['index.css'],
    status: 'tokenized',
  },
  {
    id: 'neutral-20',
    value: '#f0eae4',
    token: '--neutral-20',
    tailwindClass: 'neutral-20',
    primitive: null,
    category: 'primitive-neutral',
    label: 'Neutral 20',
    usedIn: ['index.css'],
    status: 'tokenized',
  },
  {
    id: 'neutral-30',
    value: '#e9e2db',
    token: '--neutral-30',
    tailwindClass: 'neutral-30',
    primitive: null,
    category: 'primitive-neutral',
    label: 'Neutral 30',
    usedIn: ['index.css'],
    status: 'tokenized',
  },
  {
    id: 'neutral-40',
    value: '#cfc6bc',
    token: '--neutral-40',
    tailwindClass: 'neutral-40',
    primitive: null,
    category: 'primitive-neutral',
    label: 'Neutral 40',
    usedIn: ['index.css'],
    status: 'tokenized',
  },
  {
    id: 'neutral-60',
    value: '#797065',
    token: '--neutral-60',
    tailwindClass: 'neutral-60',
    primitive: null,
    category: 'primitive-neutral',
    label: 'Neutral 60',
    usedIn: ['index.css'],
    status: 'tokenized',
  },
  {
    id: 'neutral-80',
    value: '#282017',
    token: '--neutral-80',
    tailwindClass: 'neutral-80',
    primitive: null,
    category: 'primitive-neutral',
    label: 'Neutral 80',
    usedIn: ['index.css'],
    status: 'tokenized',
  },
  {
    id: 'neutral-100',
    value: '#13110f',
    token: '--neutral-100',
    tailwindClass: 'neutral-100',
    primitive: null,
    category: 'primitive-neutral',
    label: 'Neutral 100',
    usedIn: ['index.css'],
    status: 'tokenized',
  },

  // ─── Green Scale ───────────────────────────────────────────────────────
  {
    id: 'green-20',
    value: 'oklch(0.72 0.12 163)',
    token: '--green-20',
    tailwindClass: 'green-20',
    primitive: null,
    category: 'primitive-green',
    label: 'Green 20',
    usedIn: ['index.css'],
    status: 'tokenized',
  },
  {
    id: 'green-40',
    value: 'oklch(0.58 0.05 163)',
    token: '--green-40',
    tailwindClass: 'green-40',
    primitive: null,
    category: 'primitive-green',
    label: 'Green 40',
    usedIn: ['index.css'],
    status: 'tokenized',
  },
  {
    id: 'green-60',
    value: 'oklch(0.50 0.08 163)',
    token: '--green-60',
    tailwindClass: 'green-60',
    primitive: null,
    category: 'primitive-green',
    label: 'Green 60',
    usedIn: ['index.css'],
    status: 'tokenized',
  },
  {
    id: 'green-80',
    value: 'oklch(0.36 0.05 163)',
    token: '--green-80',
    tailwindClass: 'green-80',
    primitive: null,
    category: 'primitive-green',
    label: 'Green 80',
    usedIn: ['index.css'],
    status: 'tokenized',
  },
  {
    id: 'green-100',
    value: 'oklch(0.28 0.06 163)',
    token: '--green-100',
    tailwindClass: 'green-100',
    primitive: null,
    category: 'primitive-green',
    label: 'Green 100',
    usedIn: ['index.css'],
    status: 'tokenized',
  },

  // ─── Core semantic tokens ──────────────────────────────────────────────
  { id: 'background', value: '#f9f4ef', token: '--background', tailwindClass: 'background', primitive: 'neutral-10', category: 'core', label: 'Background', usedIn: ['layouts', 'pages'], status: 'tokenized' },
  { id: 'foreground', value: '#13110f', token: '--foreground', tailwindClass: 'foreground', primitive: 'neutral-100', category: 'core', label: 'Foreground', usedIn: ['layouts', 'pages'], status: 'tokenized' },
  { id: 'card', value: '#f9f4ef', token: '--card', tailwindClass: 'card', primitive: 'neutral-10', category: 'core', label: 'Card', usedIn: ['Card component'], status: 'tokenized' },
  { id: 'card-foreground', value: '#13110f', token: '--card-foreground', tailwindClass: 'card-foreground', primitive: 'neutral-100', category: 'core', label: 'Card Foreground', usedIn: ['Card component'], status: 'tokenized' },
  { id: 'popover', value: '#f9f4ef', token: '--popover', tailwindClass: 'popover', primitive: 'neutral-10', category: 'core', label: 'Popover', usedIn: ['Popover', 'DropdownMenu'], status: 'tokenized' },
  { id: 'popover-foreground', value: '#13110f', token: '--popover-foreground', tailwindClass: 'popover-foreground', primitive: 'neutral-100', category: 'core', label: 'Popover Foreground', usedIn: ['Popover', 'DropdownMenu'], status: 'tokenized' },
  { id: 'primary-foreground', value: '#f9f4ef', token: '--primary-foreground', tailwindClass: 'primary-foreground', primitive: 'neutral-10', category: 'core', label: 'Primary Foreground', usedIn: ['buttons'], status: 'tokenized' },
  { id: 'secondary-foreground', value: '#282017', token: '--secondary-foreground', tailwindClass: 'secondary-foreground', primitive: 'neutral-80', category: 'core', label: 'Secondary Foreground', usedIn: ['secondary buttons'], status: 'tokenized' },
  { id: 'accent-foreground', value: '#f9f4ef', token: '--accent-foreground', tailwindClass: 'accent-foreground', primitive: 'neutral-10', category: 'core', label: 'Accent Foreground', usedIn: ['accent buttons'], status: 'tokenized' },
  { id: 'muted', value: '#e9e2db', token: '--muted', tailwindClass: 'muted', primitive: 'neutral-30', category: 'core', label: 'Muted', usedIn: ['muted backgrounds'], status: 'tokenized' },
  { id: 'muted-foreground', value: '#797065', token: '--muted-foreground', tailwindClass: 'muted-foreground', primitive: 'neutral-60', category: 'core', label: 'Muted Foreground', usedIn: ['placeholder text', 'hints'], status: 'tokenized' },
  { id: 'border', value: '#e9e2db', token: '--border', tailwindClass: 'border', primitive: 'neutral-30', category: 'core', label: 'Border', usedIn: ['input borders', 'dividers'], status: 'tokenized' },
  { id: 'input', value: '#e9e2db', token: '--input', tailwindClass: 'input', primitive: 'neutral-30', category: 'core', label: 'Input', usedIn: ['form inputs'], status: 'tokenized' },
  { id: 'sidebar', value: '#f0eae4', token: '--sidebar', tailwindClass: 'sidebar', primitive: 'neutral-20', category: 'core', label: 'Sidebar', usedIn: ['sidebar background'], status: 'tokenized' },
  { id: 'sidebar-foreground', value: '#13110f', token: '--sidebar-foreground', tailwindClass: 'sidebar-foreground', primitive: 'neutral-100', category: 'core', label: 'Sidebar Foreground', usedIn: ['sidebar text'], status: 'tokenized' },
  { id: 'sidebar-accent', value: '#e9e2db', token: '--sidebar-accent', tailwindClass: 'sidebar-accent', primitive: 'neutral-30', category: 'core', label: 'Sidebar Accent', usedIn: ['sidebar hover'], status: 'tokenized' },
  { id: 'sidebar-accent-foreground', value: '#13110f', token: '--sidebar-accent-foreground', tailwindClass: 'sidebar-accent-foreground', primitive: 'neutral-100', category: 'core', label: 'Sidebar Accent FG', usedIn: ['sidebar hover text'], status: 'tokenized' },
  { id: 'sidebar-border', value: '#cfc6bc', token: '--sidebar-border', tailwindClass: 'sidebar-border', primitive: 'neutral-40', category: 'core', label: 'Sidebar Border', usedIn: ['sidebar dividers'], status: 'tokenized' },
  { id: 'sidebar-primary-foreground', value: '#f9f4ef', token: '--sidebar-primary-foreground', tailwindClass: 'sidebar-primary-foreground', primitive: 'neutral-10', category: 'core', label: 'Sidebar Primary FG', usedIn: ['sidebar active text'], status: 'tokenized' },

  // ─── Core semantic tokens (chromatic — green primitives) ────────────────
  { id: 'primary', value: 'oklch(0.36 0.05 163)', token: '--primary', tailwindClass: 'primary', primitive: 'green-80', category: 'core', label: 'Primary', usedIn: ['buttons', 'links'], status: 'tokenized' },
  { id: 'primary-hover', value: 'oklch(0.28 0.06 163)', token: '--primary-hover', tailwindClass: 'primary-hover', primitive: 'green-100', category: 'core', label: 'Primary Hover', usedIn: ['button hover states'], status: 'tokenized' },
  { id: 'ring', value: 'oklch(0.58 0.05 163)', token: '--ring', tailwindClass: 'ring', primitive: 'green-40', category: 'core', label: 'Ring', usedIn: ['focus rings'], status: 'tokenized' },
  { id: 'sidebar-primary', value: 'oklch(0.36 0.05 163)', token: '--sidebar-primary', tailwindClass: 'sidebar-primary', primitive: 'green-80', category: 'core', label: 'Sidebar Primary', usedIn: ['sidebar active item'], status: 'tokenized' },
  { id: 'sidebar-ring', value: 'oklch(0.58 0.05 163)', token: '--sidebar-ring', tailwindClass: 'sidebar-ring', primitive: 'green-40', category: 'core', label: 'Sidebar Ring', usedIn: ['sidebar focus ring'], status: 'tokenized' },

  // ─── Core semantic tokens (chromatic — other) ─────────────────────────
  { id: 'secondary', value: 'oklch(0.84 0.16 90)', token: '--secondary', tailwindClass: 'secondary', primitive: null, category: 'core', label: 'Secondary', usedIn: ['secondary buttons'], status: 'tokenized' },
  { id: 'accent', value: 'oklch(0.68 0.09 280)', token: '--accent', tailwindClass: 'accent', primitive: null, category: 'core', label: 'Accent', usedIn: ['accent highlights'], status: 'tokenized' },
  { id: 'destructive', value: 'oklch(0.58 0.22 27)', token: '--destructive', tailwindClass: 'destructive', primitive: null, category: 'core', label: 'Destructive', usedIn: ['delete buttons', 'error states'], status: 'tokenized' },

  // ─── Status ────────────────────────────────────────────────────────────
  { id: 'status-paid', value: '#45825d', token: '--status-paid', tailwindClass: 'status-paid', primitive: null, category: 'status', label: 'Paid', usedIn: ['ProjectList.tsx', 'TimeEntryList.tsx', 'InvoicingPage.tsx', 'ReportsPage.tsx'], status: 'tokenized' },
  { id: 'status-invoiced', value: '#fddd74', token: '--status-invoiced', tailwindClass: 'status-invoiced', primitive: null, category: 'status', label: 'Invoiced', usedIn: ['InvoicingPage.tsx', 'ReportsPage.tsx'], status: 'tokenized' },
  { id: 'status-not-paid', value: '#e1d4c0', token: '--status-not-paid', tailwindClass: 'status-not-paid', primitive: null, category: 'status', label: 'Not Paid', usedIn: ['InvoicingPage.tsx', 'ReportsPage.tsx'], status: 'tokenized' },

  // ─── Chart (tokenized) ────────────────────────────────────────────────
  { id: 'chart-1', value: 'oklch(0.36 0.05 163)', token: '--chart-1', tailwindClass: 'chart-1', primitive: 'green-80', category: 'chart', label: 'Chart 1 (Green)', usedIn: ['ReportsPage.tsx'], status: 'tokenized' },
  { id: 'chart-2', value: 'oklch(0.84 0.16 90)', token: '--chart-2', tailwindClass: 'chart-2', primitive: null, category: 'chart', label: 'Chart 2 (Yellow)', usedIn: ['ReportsPage.tsx'], status: 'tokenized' },
  { id: 'chart-3', value: 'oklch(0.68 0.09 280)', token: '--chart-3', tailwindClass: 'chart-3', primitive: null, category: 'chart', label: 'Chart 3 (Lilac)', usedIn: ['ReportsPage.tsx'], status: 'tokenized' },
  { id: 'chart-4', value: 'oklch(0.50 0.08 163)', token: '--chart-4', tailwindClass: 'chart-4', primitive: 'green-60', category: 'chart', label: 'Chart 4 (Muted Green)', usedIn: ['ReportsPage.tsx'], status: 'tokenized' },
  { id: 'chart-5', value: 'oklch(0.75 0.12 90)', token: '--chart-5', tailwindClass: 'chart-5', primitive: null, category: 'chart', label: 'Chart 5 (Bright Yellow)', usedIn: ['ReportsPage.tsx'], status: 'tokenized' },

  // ─── Chart (unresolved — hardcoded in ReportsPage) ─────────────────────
  { id: 'chart-report-indigo', value: '#6366f1', token: null, tailwindClass: null, primitive: null, category: 'chart', label: 'Report Indigo', usedIn: ['ReportsPage.tsx', 'OnboardingWizard.tsx'], status: 'unresolved' },
  { id: 'chart-report-amber', value: '#f59e0b', token: null, tailwindClass: null, primitive: null, category: 'chart', label: 'Report Amber', usedIn: ['ReportsPage.tsx', 'ImportWizard.tsx'], status: 'unresolved' },
  { id: 'chart-report-emerald', value: '#10b981', token: null, tailwindClass: null, primitive: null, category: 'chart', label: 'Report Emerald', usedIn: ['ReportsPage.tsx', 'ImportWizard.tsx'], status: 'unresolved' },
  { id: 'chart-report-red', value: '#ef4444', token: null, tailwindClass: null, primitive: null, category: 'chart', label: 'Report Red', usedIn: ['ReportsPage.tsx', 'ImportWizard.tsx'], status: 'unresolved' },
  { id: 'chart-report-violet', value: '#8b5cf6', token: null, tailwindClass: null, primitive: null, category: 'chart', label: 'Report Violet', usedIn: ['ReportsPage.tsx', 'ImportWizard.tsx'], status: 'unresolved' },
  { id: 'chart-report-pink', value: '#ec4899', token: null, tailwindClass: null, primitive: null, category: 'chart', label: 'Report Pink', usedIn: ['ReportsPage.tsx', 'ImportWizard.tsx'], status: 'unresolved' },
  { id: 'chart-report-teal', value: '#14b8a6', token: null, tailwindClass: null, primitive: null, category: 'chart', label: 'Report Teal', usedIn: ['ReportsPage.tsx', 'ImportWizard.tsx'], status: 'unresolved' },
  { id: 'chart-report-orange', value: '#f97316', token: null, tailwindClass: null, primitive: null, category: 'chart', label: 'Report Orange', usedIn: ['ReportsPage.tsx', 'ImportWizard.tsx'], status: 'unresolved' },
  { id: 'chart-report-blue', value: '#3b82f6', token: null, tailwindClass: null, primitive: null, category: 'chart', label: 'Report Blue', usedIn: ['ReportsPage.tsx', 'ImportWizard.tsx'], status: 'unresolved' },
  { id: 'chart-report-lime', value: '#84cc16', token: null, tailwindClass: null, primitive: null, category: 'chart', label: 'Report Lime', usedIn: ['ReportsPage.tsx'], status: 'unresolved' },
  { id: 'chart-report-fallback', value: '#c4b5a0', token: null, tailwindClass: null, primitive: null, category: 'chart', label: 'Report Fallback (Tan)', usedIn: ['ReportsPage.tsx'], status: 'unresolved' },

  // ─── Client Palette ────────────────────────────────────────────────────
  { id: 'client-red', value: '#ed3838', token: null, tailwindClass: null, primitive: null, category: 'client-palette', label: 'Red', usedIn: ['color-swatch-picker.tsx'], status: 'unresolved' },
  { id: 'client-orange', value: '#f97316', token: null, tailwindClass: null, primitive: null, category: 'client-palette', label: 'Orange', usedIn: ['color-swatch-picker.tsx'], status: 'unresolved' },
  { id: 'client-amber', value: '#f6b03a', token: null, tailwindClass: null, primitive: null, category: 'client-palette', label: 'Amber', usedIn: ['color-swatch-picker.tsx'], status: 'unresolved' },
  { id: 'client-emerald', value: '#96c46e', token: null, tailwindClass: null, primitive: null, category: 'client-palette', label: 'Emerald', usedIn: ['color-swatch-picker.tsx'], status: 'unresolved' },
  { id: 'client-teal', value: '#14b8b8', token: null, tailwindClass: null, primitive: null, category: 'client-palette', label: 'Teal', usedIn: ['color-swatch-picker.tsx'], status: 'unresolved' },
  { id: 'client-sky', value: '#0ea5e9', token: null, tailwindClass: null, primitive: null, category: 'client-palette', label: 'Sky', usedIn: ['color-swatch-picker.tsx'], status: 'unresolved' },
  { id: 'client-blue', value: '#5b8bfc', token: null, tailwindClass: null, primitive: null, category: 'client-palette', label: 'Blue', usedIn: ['color-swatch-picker.tsx'], status: 'unresolved' },
  { id: 'client-indigo', value: '#7663f7', token: null, tailwindClass: null, primitive: null, category: 'client-palette', label: 'Indigo', usedIn: ['color-swatch-picker.tsx'], status: 'unresolved' },
  { id: 'client-violet', value: '#b35cf6', token: null, tailwindClass: null, primitive: null, category: 'client-palette', label: 'Violet', usedIn: ['color-swatch-picker.tsx'], status: 'unresolved' },
  { id: 'client-pink', value: '#f155ab', token: null, tailwindClass: null, primitive: null, category: 'client-palette', label: 'Pink', usedIn: ['color-swatch-picker.tsx'], status: 'unresolved' },
  { id: 'client-slate', value: '#6789b9', token: null, tailwindClass: null, primitive: null, category: 'client-palette', label: 'Slate (Default)', usedIn: ['color-swatch-picker.tsx', 'TimeEntryRow.tsx', 'ProjectCombobox.tsx', 'ProjectList.tsx', 'InvoicingPage.tsx', 'TimeEntriesPage.tsx', 'ReportsPage.tsx'], status: 'unresolved' },
  { id: 'client-black', value: '#000000', token: null, tailwindClass: null, primitive: null, category: 'client-palette', label: 'Black', usedIn: ['color-swatch-picker.tsx'], status: 'unresolved' },

  // ─── Progress ──────────────────────────────────────────────────────────
  { id: 'progress-empty', value: '#c8c8c8', token: null, tailwindClass: null, primitive: null, category: 'progress', label: 'Empty Bar', usedIn: ['ProjectList.tsx', 'TimeEntryList.tsx'], status: 'unresolved' },
  { id: 'progress-overtime', value: '#C75042', token: null, tailwindClass: null, primitive: null, category: 'progress', label: 'Overtime (Red)', usedIn: ['ProjectList.tsx', 'TimeEntryList.tsx'], status: 'unresolved' },

  // ─── PDF ───────────────────────────────────────────────────────────────
  { id: 'pdf-text', value: '#666666', token: null, tailwindClass: null, primitive: null, category: 'pdf', label: 'PDF Text', usedIn: ['pdf-report.tsx'], status: 'unresolved' },
  { id: 'pdf-text-light', value: '#888888', token: null, tailwindClass: null, primitive: null, category: 'pdf', label: 'PDF Light Text', usedIn: ['pdf-report.tsx'], status: 'unresolved' },
  { id: 'pdf-text-faint', value: '#999999', token: null, tailwindClass: null, primitive: null, category: 'pdf', label: 'PDF Faint Text', usedIn: ['pdf-report.tsx'], status: 'unresolved' },
  { id: 'pdf-bg', value: '#f5f5f5', token: null, tailwindClass: null, primitive: null, category: 'pdf', label: 'PDF Background', usedIn: ['pdf-report.tsx'], status: 'unresolved' },
  { id: 'pdf-border-dark', value: '#333333', token: null, tailwindClass: null, primitive: null, category: 'pdf', label: 'PDF Dark Border', usedIn: ['pdf-report.tsx'], status: 'unresolved' },
  { id: 'pdf-border-light', value: '#eeeeee', token: null, tailwindClass: null, primitive: null, category: 'pdf', label: 'PDF Light Border', usedIn: ['pdf-report.tsx'], status: 'unresolved' },

  // ─── Misc unresolved (non-neutral) ────────────────────────────────────
  { id: 'badge-new', value: '#f989e4', token: null, tailwindClass: null, primitive: null, category: 'chart', label: 'New Badge (Pink)', usedIn: ['ImportWizard.tsx'], status: 'unresolved' },
]
