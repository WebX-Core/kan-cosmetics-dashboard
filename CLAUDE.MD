## Tailwind CSS

- Use Tailwind v4 syntax for CSS variables: `text-(--var)` not `text-[var(--var)]`
- Apply to all utilities: `bg-(--color)`, `border-(--color)`, `text-(--text)`, etc.

# Frontend Development Guidelines

## Core Principles

- DRY: Never repeat logic, styles, or markup — extract immediately
- Single responsibility: one component = one job
- Composition over inheritance: build complex UIs from small primitives
- If you write something twice, it becomes a component, hook, or utility

---

## Project Structure

```
src/
  components/
    ui/           # Primitives: Button, Input, Badge, Card, Modal
    common/       # Shared domain-agnostic: PageHeader, EmptyState, Loader
    features/     # Feature-specific: ProductCard, OrderTable, UserAvatar
  hooks/          # All custom hooks (useForm, useFetch, useDebounce, etc.)
  utils/          # Pure functions: formatDate, cn(), truncate(), etc.)
  constants/      # Enums, config values, route paths, query keys
  types/          # Shared TypeScript types and interfaces
  styles/         # Global CSS, CSS variables, theme tokens
  pages/          # Route-level components only — no logic here
  context/        # React context providers
  services/       # API calls (never inline fetch in components)
  store/          # State management (Zustand / Redux slices)
```

---

## Components

### Rules

- One component per file; filename = component name
- Props interface defined above the component, never inline
- Default export for page/route components; named exports for everything else
- No component over ~150 lines — split it
- Extract repeated JSX blocks (3+ lines used 2+ times) into a subcomponent

### Patterns

```tsx
// Good — explicit props interface
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}

export function Button({
  label,
  onClick,
  variant = "primary",
  disabled,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        buttonVariants({ variant }),
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {label}
    </button>
  );
}
```

### Avoid

- Prop drilling beyond 2 levels → use context or state manager
- Logic inside JSX (move to variables or hooks)
- Hardcoded strings inside components (use constants)
- `any` type

---

## Tailwind CSS

- **CSS variable syntax (v4):** `text-(--var)` not `text-[var(--var)]`
- **Dynamic classes:** always use `cn()` (clsx + tailwind-merge) — never string concatenation
- **Variants:** use `cva()` for multi-variant components (Button, Badge, Input states)
- **Never** duplicate the same long className string — extract to a `cva` variant or a shared constant
- **Responsive:** mobile-first always (`md:`, `lg:` prefixes for larger screens)

```tsx
// Good
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        success: "bg-green-100 text-(--success)",
        error: "bg-red-100 text-(--error)",
        info: "bg-blue-100 text-(--info)",
      },
    },
    defaultVariants: { variant: "info" },
  },
);
```

---

## Hooks

- All reusable stateful logic lives in `src/hooks/`
- Name: `use<Feature>` (e.g., `useAuth`, `useMediaQuery`, `useLocalStorage`)
- One concern per hook
- Return named object `{ data, isLoading, error }` — not arrays (except `useState`-style pairs)

```tsx
// Good
export function useProducts(filters: ProductFilters) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["products", filters],
    queryFn: () => productService.getAll(filters),
  });
  return { products: data, isLoading, error };
}
```

---

## API / Services

- All fetch/axios calls live in `src/services/` — never inline in components or hooks
- One file per domain: `userService.ts`, `orderService.ts`
- Always type request params and responses
- Handle errors at the service layer; surface via React Query / SWR
- Use Tanstack query for api realted tasks

## TypeScript

- Strict mode always on
- No `any` — use `unknown` and narrow, or model the type properly
- Prefer `interface` for object shapes, `type` for unions/intersections
- Co-locate types with their feature; promote to `src/types/` only when shared across 3+ files
- Use discriminated unions for state machines and API response variants

```ts
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };
```

---

## State Management

- **Local UI state:** `useState` / `useReducer`
- **Server state:** React Query or SWR — never duplicate in global store
- **Global client state:** Zustand (prefer slices); Redux only if already in use
- **URL state:** `useSearchParams` for filters, tabs, pagination
- **Form state:** React Hook Form — no controlled inputs for complex forms

---

## Constants & Config

- No magic strings or numbers inline
- Route paths → `src/constants/routes.ts`
- Query keys → `src/constants/queryKeys.ts`
- Enums / lookup maps → `src/constants/enums.ts`

```ts
// Good
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  PRODUCTS: "/products",
  PRODUCT_DETAIL: (id: string) => `/products/${id}`,
} as const;
```

---

## Naming

| Thing            | Convention                          | Example                         |
| ---------------- | ----------------------------------- | ------------------------------- |
| Components       | PascalCase                          | `ProductCard.tsx`               |
| Hooks            | camelCase with `use`                | `useCartItems.ts`               |
| Utils            | camelCase                           | `formatCurrency.ts`             |
| Constants        | SCREAMING_SNAKE or camelCase object | `MAX_RETRIES`, `ROUTES.HOME`    |
| Types/Interfaces | PascalCase                          | `UserProfile`, `ApiResponse<T>` |
| CSS variables    | kebab-case                          | `--color-primary`               |
| Event handlers   | `handle` prefix                     | `handleSubmit`, `handleClose`   |

---

## Performance

- Memoize expensive computations with `useMemo`
- Memoize callbacks passed to children with `useCallback`
- Wrap pure, heavy child components with `React.memo`
- Lazy-load route-level pages with `React.lazy` + `Suspense`
- Avoid re-renders: don't create objects/arrays inline in JSX props
- Virtualize long lists (TanStack Virtual)

---

## Accessibility

- Semantic HTML first (`button` not `div onClick`)
- All `<img>` elements have meaningful `alt` text
- Form inputs always have associated `<label>` (via `htmlFor` or wrapping)
- Interactive elements are keyboard navigable
- Use `aria-` attributes only when semantic HTML isn't enough
- Use `<Image>` when wer'e on Nextjs

---

## Do Not

- ❌ Inline styles (use Tailwind or CSS vars)
- ❌ `console.log` committed to source
- ❌ `// @ts-ignore` without a comment explaining why
- ❌ Fetching data directly inside `useEffect` (use React Query)
- ❌ God components that do everything
- ❌ Copy-pasting blocks of JSX — extract it
- ❌ Naming components `Component`, `Helper`, `Utils`, `Misc`
- ❌ Default exports for utility files
