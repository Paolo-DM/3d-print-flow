# Project Context — 3D Print Flow

## Tech Stack

- **Framework:** React Router v7 (file-based routing, SSR via `react-router-serve`)
- **Language:** TypeScript (strict)
- **UI Library:** React 19
- **Styling:** Tailwind CSS v4 with shadcn/ui components
- **Component Primitives:** Radix UI
- **Icons:** Lucide React
- **Font:** Inter Variable
- **Build Tool:** Vite 7
- **Compiler:** React Compiler (`babel-plugin-react-compiler`) — automatic memoization at build time
- **Linting:** ESLint with `eslint-plugin-react-hooks` (`recommended-latest` preset, includes compiler rules)
- **Formatting:** Prettier with `prettier-plugin-tailwindcss`

## Design Principles

### Code Quality

- **SOLID** — Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion.
- **DRY** — Don't repeat yourself. Extract shared logic into reusable functions or hooks, but only when repetition is real (3+ occurrences), not hypothetical.
- **KISS** — Keep it simple. Prefer the simplest solution that solves the problem. Avoid premature abstractions and over-engineering.

### TypeScript

- Use strict TypeScript throughout. No `any` unless absolutely unavoidable (and document why).
- Prefer `interface` for object shapes and `type` for unions/intersections.
- Use discriminated unions for state that can be in multiple shapes.
- Leverage type inference where the type is obvious; add explicit annotations at module boundaries (function signatures, exports).
- Use `satisfies` operator when you need type-checking without widening.
- Prefer `as const` for literal types and exhaustive checks.

### Styling

- Use **Tailwind CSS utility classes** exclusively for styling. No inline styles, no CSS modules.
- Use the **pre-defined CSS custom properties** from the shadcn theme in `app/app.css`. Reference them via Tailwind classes (e.g., `bg-primary`, `text-muted-foreground`, `border-border`). Do not hardcode colors — always use the semantic tokens.
- Available semantic color tokens: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart-1` through `chart-5`, and `sidebar-*` variants.
- Dark mode is supported via the `.dark` class. Use Tailwind's `dark:` variant where needed.
- Use `cn()` (clsx + tailwind-merge) for conditional class composition.
- Use shadcn/ui components from the project's component library. Don't reinvent what already exists.

### React Compiler

- The React Compiler automatically memoizes components, calculations, and callbacks at build time.
- **Do not use `useMemo`, `useCallback`, or `React.memo` manually** — the compiler handles this. They remain available as escape hatches but should not be needed in normal code.
- The compiler only optimizes code inside React components and hooks (PascalCase or `use` prefix). Standalone utility functions are not memoized.
- Code must follow the Rules of React (pure renders, no side effects during render) for the compiler to optimize it. Violations cause the compiler to silently skip optimization for that component.
- The `recommended-latest` ESLint preset enforces compiler-specific rules (`react-hooks/purity`, `react-hooks/immutability`, etc.) — do not disable these.

### React Patterns

- **Minimize `useEffect` usage.** Follow the React "You Might Not Need an Effect" philosophy:
  - Derive values during render instead of syncing state with Effects.
  - Handle user interactions in event handlers, not Effects.
  - Use `key` props to reset component state instead of Effects that clear state on prop changes.
  - Keep Effects only for synchronizing with external systems (browser APIs, third-party libraries, network subscriptions).
  - When data fetching is needed, use React Router loaders/actions instead of `useEffect` + `fetch`.
- Prefer controlled components. Lift state up when multiple components need to share it.
- Compose components with clear, single-responsibility boundaries.
- Use React Router's data loading patterns (`loader`, `action`, `useFetcher`) for server communication instead of client-side fetching in Effects.
- Prefer calculated/derived values over redundant state.

### File Organization

- Follow React Router v7 file-based routing conventions in `app/routes/`.
- Co-locate components with the routes that use them when they're route-specific.
- Shared components go in `app/components/`.
- Utility functions go in `app/lib/`.
