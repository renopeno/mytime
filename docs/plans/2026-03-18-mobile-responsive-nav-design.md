# Mobile Responsive Nav & Sticky Cleanup

## Summary

Two changes to improve mobile responsiveness:
1. New mobile top nav bar visually consistent with desktop sidebar
2. Reduce sticky area on TimeEntriesPage to only the quick entry form

## 1. Mobile Top Nav Bar

**Visibility:** `md:hidden` (below 768px only)

**Layout:** Horizontal bar, three sections:
- **Left:** Sidebar icon (replaces hamburger) → opens existing drawer
- **Center:** "MyTime" logo + "Free" badge (same as sidebar header)
- **Right:** User avatar → dropdown menu (Settings, Sign out — same as sidebar footer)

**Styling:**
- Background: `--sidebar` color (matches desktop sidebar)
- Consistent padding/height with sidebar header

## 2. Main Content on Mobile

- `rounded-t-xl` (top-left + top-right radius only)
- No horizontal margins (full-width to save space)
- Visually connects to the top nav above

## 3. TimeEntriesPage Sticky Cleanup

**Before:** Entire block is `sticky top-0` — quick entry, progress bar, KPIs, filters

**After:**
- **Sticky:** Only the quick entry form (input fields for time entry creation)
- **Scrollable:** Weekly progress bar, 3 KPI cards, date/project filters

**Order top→bottom:** Sticky inputs → progress bar → KPI cards → filters → entry list

## Files to Modify

- `src/components/layout/AppLayout.tsx` — replace MobileHeader, adjust SidebarInset mobile styles
- `src/components/layout/Sidebar.tsx` — possibly extract avatar/dropdown for reuse in top nav
- `src/pages/TimeEntriesPage.tsx` — restructure sticky wrapper to only wrap quick entry form
