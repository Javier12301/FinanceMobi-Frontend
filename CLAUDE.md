# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es esto

Frontend de **FinanceMobile**: SPA mobile-first de finanzas personales (billeteras, movimientos, delegación de cuentas, adjuntos en Google Drive del propio usuario). Vite + React 19 + TypeScript. El backend es un proyecto aparte; este repo consume su API REST documentada en ../docs/03-arquitectura/api-y-contrato.md.

Responder al usuario en **español**.

## Comandos

```bash
npm run dev         # dev server en :5173 (el plugin de TanStack Router genera src/routeTree.gen.ts)
npm run build       # build de prod (NO uses "tsc && vite build": tsc corre antes de generar el routeTree y falla)
npm run typecheck   # tsc -b --noEmit — ESTE es el check obligatorio antes de dar algo por hecho (no hay tests aún)
npm run preview     # sirve el build
npx shadcn@latest add <componente> --yes   # agregar primitivos de UI (van a src/components/ui/)
```

No hay framework de tests configurado. La verificación es `npm run typecheck` + `npm run build`. Verificación visual: pedir al usuario abrir `http://localhost:5173` o usar las skills de Chrome si la extensión está conectada.

## Arquitectura (lo que hay que entender antes de tocar)

**Feature-sliced.** La lógica de negocio vive en `src/features/<dominio>/` (`auth`, `wallets`, `categories`, `transactions`, `delegations`, `drive`). Cada feature expone su API pública por su `index.ts` (barrel) y se consume como `@/features/<x>` — **no importar archivos internos de otra feature por path profundo**. `pages/` solo ensambla features; `routes/` (file-based de TanStack Router) solo cablea `pages/`.

**Capa de red — una sola instancia.** Todo pasa por `src/config/api.ts` (axios). Sus interceptores inyectan en cada request:
- `Authorization: Bearer <token>` desde `useAuthStore`.
- `X-Owner-Id` desde `useOwnerStore` (el "dueño" cuyos datos se ven: uno mismo, o una cuenta delegada).
Normaliza errores a `ApiError {status, message, notImplemented}`; `401` limpia sesión y redirige. Para mostrar errores usar `errorMessage(e)` / `isApiError(e)`.

**Dos stores globales** (`src/store/`): `useAuthStore` (token + usuario derivado del JWT, persistido vía `config/tokenStorage`) y `useOwnerStore` (owner activo + contexto de delegación + `isReadOnly` cuando el rol es ASESOR). Al cambiar de owner, las query keys (que incluyen `ownerId`) refrescan solo. **Reglas de UI sensibles al rol deben mirar `isReadOnly`.**

**Modales/drawers globales por store.** `TransactionFormModal`, `TransactionDetailDrawer` y `WalletFormModal` se montan UNA vez en `MainLayout` y se abren desde cualquier lado vía sus stores (`useTransactionModal`, `useTransactionDrawer`, `useWalletModal`). No re-montarlos en páginas.

**Responsive = un patrón, no duplicar pantallas.** `useIsDesktop()` (breakpoint `md`, 768px) decide: `Sidebar` (desktop) vs `BottomNav`+FAB (mobile); `ResponsiveModal` = `Dialog` en desktop / bottom `Sheet` en mobile. Componentes como `TransactionRow` se reusan en ambos. Mobile-first siempre: clases base = mobile, `sm:`/`md:`/`lg:` escalan.

**Tokens de diseño** en `src/index.css`: variables del prototipo Claude Design mapeadas a tokens semánticos de shadcn (`:root` light / `.dark`). Primario teal `#3ABFBF`. Extras propios: `bg-primary-soft`, `bg-surface`, `text-success`. Iconos: lucide. No hardcodear colores hex en componentes; usar los tokens.

**Guards de ruta** leen el store directamente en `beforeLoad` (import estático de `useAuthStore`, no dinámico — el dinámico genera warning de chunking). `_app.tsx` protege todo lo logueado.

## Realidad del contrato (importante)

- Métodos: usar **PUT** (no PATCH) para editar wallets/transactions — así lo expone el backend.
- **Decimales llegan como string** (`"1500.00"`). Usar `parseDecimal`/`formatCurrency` de `src/utils/`, nunca `Number()` directo para mostrar dinero.
- **Endpoints stub 501**: borrar transacción, subir/borrar adjuntos. La UI los llama y maneja el `501` como "no disponible". No los rompas "arreglándolos".
- **Endpoints cableados pero inexistentes en v1**: Registro y Delegaciones. Fallan con error controlado hasta que el backend los publique.
- Si una feature nueva necesita algo del backend que no existe, documentar el contrato esperado en ../docs/ — no inventar/mockear silenciosamente.

Documentos de referencia: ../docs/03-arquitectura/api-y-contrato.md (API actual), ../docs/README.md (índice) y las funcionalidades aplicables bajo ../docs/02-funcionalidades/.

## Cómo trabajar mejoras de UI/UX y funcionalidades

El norte del producto es **bajar la fricción de cargar movimientos** (la app muere sin datos). Antes de proponer features, leer ../docs/01-producto/vision-y-alcance.md. Toda mejora se evalúa contra: ¿hace más rápido/cómodo registrar un gasto?

**Documentarse antes de aplicar/recomendar librerías:** usar **context7** (`resolve-library-id` → `query-docs`) para TanStack Router/Query, shadcn, Tailwind v4, etc. Las versiones se mueven; no asumir de memoria.

## Documentación vigente

La documentación de producto y contratos vive en ../docs/. Revisar ../docs/README.md antes de cambios que afecten comportamiento, contratos o arquitectura.
