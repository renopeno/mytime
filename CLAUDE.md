# MyTimeTracker — Development Instructions

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
