# Code & Design Conventions

## 1. TypeScript Standards
- **Strict Mode**: Enabled via `tsconfig.app.json` with strict type checking.
- **Zero `any`**: Explicitly forbidden. All network payloads, domain models, and props must be strictly typed.
- **No Suppressions**: `@ts-ignore`, `@ts-nocheck`, or `@ts-expect-error` are not allowed.
- **Domain Models**: Centralized in `src/types/github.ts`.

## 2. React Patterns
- **Functional Components Only**: Modern functional components with React hooks.
- **Single Responsibility**: Components remain focused. View logic stays in `src/pages/`, presentation and sub-views in `src/components/`, data operations in `src/services/`.
- **Custom Hooks & Standard Hooks**: Use `useState`, `useMemo`, `useCallback`, `useEffect` appropriately to prevent unnecessary renders and garbage collection.
- **No Global Stores**: Do not introduce Redux, MobX, or Zustand. Pass state explicitly or derive locally.

## 3. Styling & Visual Language
- **Handcrafted CSS**: Single source of truth in `src/index.css`.
- **Aesthetic**: Linear x Vercel x GitHub theme — light frosted material design, fine borders, translucent card surfaces, subtle gradients, soft shadows.
- **No Inline Styles**: Ad-hoc CSS in `style={...}` is discouraged except for dynamic layout measurements or custom property bindings.
- **Accessibility & Focus**: All buttons, links, inputs, and custom dropdowns must have visible `:focus-visible` outlines and keyboard navigation support.
- **Responsive Breakpoints**:
  - Desktop (>1024px): Multi-column grids and dual-pane views.
  - Tablet (768px - 1024px): Adaptive side-by-side or stacked layouts.
  - Mobile (<768px): Single column, touch-friendly tap targets (>44px), scrollable code diffs.

## 4. Error Handling & User Communication
- **No Browser `alert()`**: Always use in-UI banners, toast alerts, or inline retry buttons.
- **Contextual Retry**: Failed network fetches must provide an inline `Retry` trigger without requiring a full page refresh.
- **Graceful Fallbacks**: Empty collections, missing avatars, null bios, or zero commits must render structured empty states rather than blank cards.

## 5. Git & Code Safety
- **Protocol Whitelisting**: Any external links opened via `<a>` must be sanitized through `sanitizeExternalUrl()`.
- **Target `_blank`**: External links must include `rel="noopener noreferrer"`.
