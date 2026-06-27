# FinanceVier — Frontend

SPA mobile-first de gestión de finanzas personales. **Vite + React + TypeScript**, con TanStack Router/Query, shadcn/ui + Tailwind v4 y Zustand.

## Requisitos

- Node.js 20+
- Backend de FinanceVier corriendo (ver `docs/contrato-frontend-v1.md`). En dev: `http://localhost:3000`.

## Puesta en marcha

```bash
cp .env.example .env   # ajustar VITE_API_BASE_URL y VITE_GOOGLE_CLIENT_ID
npm install
npm run dev            # http://localhost:5173
```

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (genera el route tree automáticamente) |
| `npm run build` | Build de producción |
| `npm run preview` | Sirve el build |
| `npm run typecheck` | Chequeo de tipos |

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_API_BASE_URL` | URL base de la API (incluye `/api`) |
| `VITE_GOOGLE_CLIENT_ID` | Client ID web para Google Sign-In |

## Arquitectura

Feature-sliced. Cada módulo en `src/features/<x>/` expone su API pública por `index.ts`:

```
src/
├── app/          # router, queryClient, providers
├── routes/       # rutas file-based de TanStack Router
├── pages/        # ensamblaje de cada pantalla
├── components/   # ui (shadcn), elements (marca), layouts
├── config/       # env, axios (api), tokenStorage
├── store/        # estado global UI (auth, owner activo)
├── hooks/ utils/ lib/
└── features/     # auth, wallets, categories, transactions, delegations, drive
```

- **Auth + contexto de owner**: el JWT se guarda vía `config/tokenStorage` (localStorage en web; punto de swap a SecureStorage en mobile). Axios inyecta `Authorization` y `X-Owner-Id` (owner propio o cuenta delegada) en cada request.
- **Mobile-first**: bottom nav + FAB en mobile; sidebar fijo desde `md:`. Modales = bottom sheet en mobile / dialog en desktop.

## Notas sobre el contrato

- Algunas pantallas (**Registro**, **Delegaciones**) están cableadas contra endpoints que el contrato v1 aún no expone; fallarán con error controlado hasta que el backend los publique.
- Endpoints stub del backend (501): borrado de transacciones y subida de adjuntos. La UI los muestra como "no disponible / próximamente".
