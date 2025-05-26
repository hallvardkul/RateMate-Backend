---
description: Rules that apply only to the React app
globs:
  - "Ratemate-Frontend/**"
alwaysApply: false
---

- React components = **function components** with typed props (`interface Props {}`).
- Use **TanStack Query** for server state; local state via `useState`.
- All network calls go through `src/lib/api.ts` and must:
  1. Prefix the backend URL from `import.meta.env.VITE_API_URL`.
  2. Handle 401/403 by redirecting to `/login`.
- Use **lazy loading** (`React.lazy`, `Suspense`) for heavy pages.
- Place images in `/assets/` and reference via `import img from ...`. 