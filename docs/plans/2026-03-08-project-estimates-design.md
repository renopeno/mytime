# Project Estimates & Progress Bar

## Summary

Add an `estimated_hours` field to projects. Display a progress bar in the Projects table showing logged hours vs estimate. When logged hours exceed the estimate, the bar turns red.

## Data Model

Add to `projects` table:

- `estimated_hours: number | null` — total estimated hours for the project. Null means no estimate set.

## Project Form (Create & Edit)

New field **"Estimated hours"** — number input (step 0.5, min 0). Placed after the hourly rate field. Optional (nullable). Placeholder: "No estimate".

## Projects Table — New "Progress" Column

New column between **Rate** and **Actions**:

| State | Visual |
|-------|--------|
| No estimate | `—` (em dash) |
| Under 100% | Green progress bar + `12h / 40h` text |
| Over 100% | Red progress bar (full) + `50h / 40h` text in red |

Progress percentage = `(total_logged_minutes / 60) / estimated_hours * 100`, capped at 100% for bar width.

## Logged Hours Aggregation

Each project needs total logged minutes from its time entries. This is computed in the ProjectsPage by aggregating time entries grouped by project_id, then passed to ProjectList as a `Map<projectId, totalMinutes>`.

## Files to Change

1. `src/types/database.types.ts` — add `estimated_hours` to projects Row/Insert/Update
2. `src/lib/dev-db.ts` — add `estimated_hours` to seed projects + bump version
3. `src/hooks/useProjects.ts` — include `estimated_hours` in create/update
4. `src/components/projects/ProjectForm.tsx` — add estimated hours input field
5. `src/components/projects/ProjectList.tsx` — add Progress column with bar
6. `src/pages/ProjectsPage.tsx` — aggregate logged hours per project, pass to ProjectList
