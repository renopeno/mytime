# Mobile Responsive Nav & Sticky Cleanup — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the minimal mobile header with a top nav bar that matches the desktop sidebar styling, add user avatar dropdown to it, apply `rounded-t-xl` to mobile content, and reduce the sticky area on TimeEntriesPage to only the quick entry form.

**Architecture:** Three isolated changes — (1) new MobileHeader in AppLayout with sidebar-colored background, sidebar icon, logo+badge, and user avatar dropdown, (2) mobile-only rounded top on SidebarInset content, (3) restructure TimeEntriesPage sticky wrapper.

**Tech Stack:** React, Tailwind CSS, shadcn/ui (Sidebar, DropdownMenu, Avatar), lucide-react icons

---

### Task 1: Extract UserAvatarMenu into a shared component

The sidebar footer and the new mobile header both need the same avatar + dropdown. Extract it so both can reuse it.

**Files:**
- Create: `src/components/layout/UserAvatarMenu.tsx`
- Modify: `src/components/layout/Sidebar.tsx:109-141`

**Step 1: Create the shared UserAvatarMenu component**

Create `src/components/layout/UserAvatarMenu.tsx`:

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Link } from 'react-router'
import { LogOut, Settings2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const DEV_MODE = import.meta.env.DEV

export function UserAvatarMenu({
  side = 'top',
  align = 'start',
}: {
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
}) {
  const { user, signOut, setDevShowLogin } = useAuth()

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const fullName = (user?.user_metadata?.full_name as string) ?? user?.email ?? 'User'
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={avatarUrl} alt={fullName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="w-48">
        <DropdownMenuItem render={<Link to="/settings" className="flex items-center gap-2" />}>
          <Settings2 className="h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => { DEV_MODE ? setDevShowLogin(true) : void signOut() }}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Step 2: Refactor Sidebar.tsx to use UserAvatarMenu**

In `src/components/layout/Sidebar.tsx`, replace the SidebarFooter contents (lines 109-141) with a version that reuses `UserAvatarMenu` for the dropdown but keeps the sidebar-specific layout (full name, email display, collapsible icon behavior). The sidebar footer needs more than just the avatar (it shows name + email), so keep the existing trigger layout but import the dropdown logic. Actually — the sidebar footer has unique layout (name+email next to avatar, collapsible icon classes), so keep it as-is and only use UserAvatarMenu in the mobile header. Skip refactoring Sidebar.tsx for now — the duplication is minimal and the two contexts have different layout needs.

**Step 3: Commit**

```bash
git add src/components/layout/UserAvatarMenu.tsx
git commit -m "feat: add UserAvatarMenu shared component for mobile nav"
```

---

### Task 2: Replace MobileHeader with new top nav bar

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`

**Step 1: Rewrite MobileHeader**

Replace the existing `MobileHeader` function (lines 9-26) in `AppLayout.tsx` with:

```tsx
import { UserAvatarMenu } from './UserAvatarMenu'
import { PanelLeft } from 'lucide-react'
// (keep existing imports, replace Menu with PanelLeft)

function MobileHeader() {
  const { toggleSidebar } = useSidebar()

  return (
    <header className="flex items-center justify-between bg-sidebar px-4 py-3 md:hidden">
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 -ml-1"
        onClick={toggleSidebar}
        aria-label="Open menu"
      >
        <PanelLeft className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-2">
        <span className="font-serif text-xl font-medium tracking-tight leading-none">MyTime</span>
        <span className="shrink-0 rounded-full bg-secondary px-1.5 py-px text-[8px] font-semibold text-secondary-foreground uppercase tracking-wider">
          Free
        </span>
      </div>
      <UserAvatarMenu side="bottom" align="end" />
    </header>
  )
}
```

Key changes vs current:
- `bg-sidebar` background (matches desktop sidebar)
- `justify-between` for left/center/right layout
- `PanelLeft` icon instead of `Menu` (hamburger)
- Center: logo + "Free" badge (same markup as sidebar header)
- Right: `UserAvatarMenu` with dropdown opening downward

**Step 2: Update imports**

In the imports section of `AppLayout.tsx`:
- Remove: `Menu` from lucide-react
- Add: `PanelLeft` from lucide-react
- Add: `import { UserAvatarMenu } from './UserAvatarMenu'`

**Step 3: Commit**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat: mobile top nav with sidebar styling, sidebar icon, and avatar"
```

---

### Task 3: Add `rounded-t-xl` to mobile content area

**Files:**
- Modify: `src/components/layout/AppLayout.tsx:37`

**Step 1: Add rounded top + background to the content wrapper**

Change line 37 from:

```tsx
<div className="min-h-0 flex-1 overflow-y-auto">
```

to:

```tsx
<div className="min-h-0 flex-1 overflow-y-auto rounded-t-xl md:rounded-t-none bg-background">
```

This adds `rounded-t-xl` on mobile only (removed on md+ via `md:rounded-t-none`) and ensures the background color is explicit so the rounded corners reveal the sidebar color behind.

**Step 2: Also remove the border-b from old mobile header if still present**

The old header had `border-b` — verify the new one does not (it shouldn't, since the rounded content below creates the visual separation).

**Step 3: Commit**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat: rounded top corners on mobile content area"
```

---

### Task 4: Reduce sticky area on TimeEntriesPage

**Files:**
- Modify: `src/pages/TimeEntriesPage.tsx:166-275`

**Step 1: Restructure the sticky wrapper**

Currently (lines 170-275), the entire dark header + filters are wrapped in `<div className="sticky top-0 z-20">`. Split this so only the quick entry form is sticky.

Replace the JSX from line 167 to line 298 with this structure:

```tsx
return (
  <div>

    {/* Sticky zone — only quick entry form */}
    <div className="sticky top-0 z-20 bg-muted">
      <div className="px-5 md:px-6 pt-6 pb-5">
        <QuickEntryForm
          onSubmit={createEntry}
          date={quickDate}
          onDateChange={setQuickDate}
        />
      </div>
    </div>

    {/* Scrollable: progress bar + KPIs + rounded cap */}
    <div className="bg-muted">
      <div className="px-5 md:px-6">
        {/* Weekly progress bar */}
        <div className="h-[3px] overflow-hidden rounded-full bg-sidebar-accent">
          {/* ... existing progress bar JSX unchanged (lines 182-209) ... */}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* ... existing 3 KPI cards unchanged (lines 213-252) ... */}
        </div>
      </div>

      {/* Rounded white cap */}
      <div className="mt-5 h-[32px] bg-background rounded-t-[16px] shadow-xs" />
    </div>

    {/* Filters — scrollable */}
    <div className="bg-background px-5 md:px-6 pb-2">
      <TimeEntryFilters
        startDate={startDate}
        endDate={endDate}
        projectId={projectId}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onProjectChange={setProjectId}
        onClear={() => {
          setStartDate(undefined)
          setEndDate(undefined)
          setProjectId('')
        }}
      />
    </div>

    {/* Scrollable content */}
    <div className="px-5 md:px-6 pb-5">
      <div className="mt-4">
        {/* ... existing loading/list JSX unchanged (lines 280-294) ... */}
      </div>
    </div>

  </div>
)
```

Key changes:
- `sticky top-0 z-20` wraps only the QuickEntryForm, with `bg-muted` and `pb-5` for spacing
- Progress bar, KPIs, and rounded cap are in a non-sticky `bg-muted` div
- Filters are in a separate non-sticky div
- All inner content (progress bar, KPIs, filters, list) remains identical

**Step 2: Commit**

```bash
git add src/pages/TimeEntriesPage.tsx
git commit -m "feat: only quick entry form is sticky, KPIs and filters scroll"
```

---

### Task 5: Visual verification

**Step 1: Start dev server and verify mobile view**

Run: `npm run dev`

Check at 375px width (mobile):
- Top nav bar has sidebar background color
- Left: PanelLeft icon opens drawer
- Center: "MyTime" + "Free" badge
- Right: Avatar with working dropdown (Settings, Sign out)
- Content below has rounded top corners
- No horizontal margins on content

**Step 2: Verify desktop is unchanged**

Check at 1280px width:
- Sidebar is the same as before
- No mobile top nav visible
- Content area styling unchanged

**Step 3: Verify TimeEntriesPage sticky behavior**

On both mobile and desktop:
- Quick entry form stays sticky at top when scrolling
- Progress bar, KPIs, and filters scroll away normally
- No visual glitches at the sticky/non-sticky boundary

**Step 4: Commit any fixes if needed**
