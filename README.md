# Tijarah Connect — Admin Panel (`admin-app`)

React admin dashboard for managing the Tijarah Connect platform.

## Quick Start

```bash
npm install
echo "VITE_API_URL=http://localhost:3001/api/" > .env
npm run dev    # http://localhost:5173
```

Login requires a valid admin account (created via backend `admin-auth` module).

---

## Architecture

```
src/
├── App.tsx              → Router + lazy-loaded page imports
├── main.tsx             → Entry point (Redux Provider, React Query)
├── pages/               → One file per admin page (35 pages)
├── services/            → API service files (one per domain, 32 files)
│   └── api.ts           → Axios instance with auth interceptor
├── store/
│   └── slices/          → Redux Toolkit slices (auth, users)
├── components/
│   ├── layout/          → AdminLayout, Sidebar, Header
│   └── ui/              → Reusable UI components (shadcn/radix-based)
├── hooks/               → Custom React hooks
├── types/               → TypeScript interfaces
└── utils/
    └── constants.ts     → Route paths + API_BASE_URL
```

### Pages (grouped by sidebar section)

| Section | Pages |
|---------|-------|
| **Overview** | Dashboard |
| **Content** | Users, Providers, Categories, Products, CreateUser, CreateProviderFlow |
| **Moderation** | Verifications, Reviews, Reports, BugReports, Warnings, ChatModeration, PhotoModeration, ModerationQueue |
| **Marketing** | Banners, Sponsorships, Offers, Badges, Notifications |
| **Monetization** | Vouchers, Payments, Subscriptions, Revenue, MonetizationSettings |
| **Women-Led** | WomenLed |
| **Insights** | Analytics |
| **System** | AdminUsers, AuditLog, Settings, FeatureFlags |

---

## Key Patterns

### API Services

Every page has a corresponding service file in `src/services/`. All services import the shared Axios instance:

```typescript
// src/services/providers.service.ts
import api from './api';

export const getProviders = (params) => api.get('/admin/providers', { params });
export const updateProvider = (id, data) => api.patch(`/admin/providers/${id}`, data);
```

The base `api.ts` handles:
- Attaching JWT from `localStorage` to every request
- Redirecting to `/login` on 401 responses
- Base URL from `VITE_API_URL` env var

### Authentication

- Admin logs in via OTP (phone number) → backend returns JWT
- Token stored in `localStorage` and Redux `authSlice`
- `ProtectedRoute` wrapper redirects unauthenticated users to login

### State Management

- **Redux Toolkit** for global state (auth status, user data)
- **React Query** (`@tanstack/react-query`) for server state (API data fetching/caching)
- Most pages use React Query directly — Redux is minimal (2 slices)

### Routing

- React Router v7 with code-splitting via `React.lazy()`
- All route paths defined in `src/utils/constants.ts` → `ROUTES` object
- `AdminLayout` wraps all authenticated pages (sidebar + header)

### UI Components

Built with **Radix UI** primitives + **Tailwind CSS**:
- Dialog, Select, Dropdown, Checkbox, Tabs, Avatar, Label
- Icons from `lucide-react`
- Charts from `recharts`
- Maps from `react-leaflet`
- Toasts from `react-toastify`

---

## Adding a New Page

1. **Create page**: `src/pages/MyFeature.tsx`
2. **Create service**: `src/services/my-feature.service.ts` (import `api` from `./api`)
3. **Add route** in `src/utils/constants.ts`:
   ```typescript
   MY_FEATURE: '/my-feature',
   ```
4. **Add lazy import** in `App.tsx`:
   ```typescript
   const MyFeature = lazy(() => import('./pages/MyFeature'));
   ```
5. **Add Route** inside the `AdminLayout` route group:
   ```tsx
   <Route path={ROUTES.MY_FEATURE} element={<MyFeature />} />
   ```
6. **Add sidebar link** in `components/layout/AdminLayout.tsx`

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## Useful Links

- [ENV_REFERENCE.md](../ENV_REFERENCE.md) — environment variables
- [API_REFERENCE.md](../API_REFERENCE.md) — backend endpoints used by admin
- [documentation/UI_DESIGN_SPEC.md](../documentation/UI_DESIGN_SPEC.md) — design system (colors, typography)
