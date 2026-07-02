# Plan mobile offline-first + checklist de implementadores

> Documento de contexto y tareas. El **norte** sigue siendo el de
> [`para-front/mejoras-ux-y-roadmap.md`](./para-front/mejoras-ux-y-roadmap.md):
> bajar la fricción de cargar movimientos. Esto lo lleva a un **APK offline**.

## Qué estamos haciendo y por qué

El deploy web quedó caro/sin sentido por ahora. El uso real es **mobile**: administrar
gastos desde el celular, idealmente **sin internet**, con **SQLite local** que en el
futuro sincronice con MySQL cuando haya cloud. Meta concreta: un **APK instalable** que
corre la app actual, cómodo en mobile, que permite **anotar gastos offline** y los sube
solos al reconectar — **sin reescribir app ni backend**.

### Decisiones cerradas
- **Offline = Outbox + replay** (NO motor de sync bidireccional). SQLite local = caché de
  lectura + cola de cambios pendientes; al reconectar se reenvían a la **API REST que ya
  existe**; el **servidor sigue siendo la fuente de verdad del balance**. Single-device.
- **Orden = APK usable + UX primero**, offline después.
- **Mobile shell = Capacitor** (envuelve la SPA actual; el código ya lo anticipa). No React Native.

### Por qué es factible sin reescribir
- IDs **UUID** en todo el backend → el cliente genera IDs locales sin colisión (outbox idempotente).
- El front **ya anticipa Capacitor**: `src/config/tokenStorage.ts:8`, `src/features/auth/api/googleIdentity.ts:7`.
- Mobile-first ya hecho: numpad custom, `BottomNav`+FAB, `ResponsiveModal`.
- Login Google por ID-token **ya sirve desde Android** (`Backend/src/core/security/googleAuth.ts:11`).
- Delegaciones (supervisor/asesor) **ya implementadas en backend** (`Backend/src/features/delegations/`).
- Toda mutación pasa por un único choke point (`src/features/transactions/api/useTransactionMutations.ts`).

### Orquestación (cómo trabajamos)
Orquestador divide/integra; implementación = **subagentes Haiku con ponytail**, tarea acotada
por subagente, **sin subagentes anidados**. Cada tarea abajo es autocontenida para un implementador
que arranca en frío. Check obligatorio del front: `npm run typecheck` + `npm run build`
(NO `tsc && vite build`).

---

## Tramo 1 — APK usable + UX  ← EMPEZAR AQUÍ

### T1A · Shell Capacitor  `[x]` HECHO
> Instalados `@capacitor/core` + `-D @capacitor/cli`, `cap init` (com.financemobile.app, webDir=dist),
> `cap add android` (proyecto en `android/`). Base URL nativa resuelta en `src/config/env.ts`
> (`getServerUrl`/`setServerUrl` en localStorage; sin `@capacitor/preferences` — el WebView persiste).
> Campo "URL del servidor" en Ajustes (`SettingsPage.tsx`, solo si `env.isNative`). `build` + `cap sync` OK.
> Pendiente manual del usuario: compilar el APK en Android Studio / `cap open android`.

- `npm i @capacitor/core && npm i -D @capacitor/cli` en `Frontend/`.
- `npx cap init "FinanceMobile" "com.financemobile.app" --web-dir=dist`.
- `npm i @capacitor/android && npx cap add android`.
- Build + sync: `npm run build && npx cap sync android`. (Compilar el APK = Android Studio/Gradle, tarea del usuario.)
- **Base URL nativa** en `src/config/env.ts`: si `Capacitor.isNativePlatform()`, la base URL NO puede salir
  de `window.location` (en APK es `localhost`). Leerla de `@capacitor/preferences` (`server.url`), con
  campo editable en Ajustes. Default vacío → onboarding pide configurarla (IP LAN hoy, dominio cloud mañana).
- **Swap storage**: reemplazar el cuerpo de los 3 métodos de `src/config/tokenStorage.ts` por
  `@capacitor/preferences` cuando `isNativePlatform()`, manteniendo `localStorage` en web. **Interfaz intacta.**
- Iconos/splash: `@capacitor/assets`. Revisar `theme-color`/viewport en `index.html`.

### T1B · Google login en APK  `[ ]`
- Backend: `Backend/src/core/security/googleAuth.ts:11` aceptar **array de audiences**
  (`[WEB_CLIENT_ID, ANDROID_CLIENT_ID]`) desde env. Agregar `GOOGLE_ANDROID_CLIENT_ID` a `.env.example`.
- Frontend: swap de `src/features/auth/api/googleIdentity.ts` a `@capacitor-community/google-auth` en nativo
  (devuelve `idToken` compatible con `POST /api/auth/google`). Mantener GIS web para navegador.
- Manual (usuario): crear Android OAuth Client en Google Cloud (SHA-1 del keystore).

### T1C · Quick wins de UX  `[x]` HECHO
> Ya existían: gasto por defecto + foco en monto, chip "Ayer", botón "Repetir" (drawer).
> Agregados: chips de montos sugeridos (1000/5000/10000, min-h 44px) y toast "Deshacer" (4s, borra la txn)
> en `TransactionMobileForm.tsx`. De paso, arreglado el tipo de `activeProps` en `Sidebar.tsx`. typecheck OK.

#### (referencia original)

Sobre `src/features/transactions/components/TransactionMobileForm.tsx` (ver roadmap §1):
- Gasto por defecto (`type=EXPENSE`) + foco directo en el monto/numpad, saltando el paso de tipo.
- Montos sugeridos: chips 1.000 / 5.000 / 10.000 + "último de esta categoría".
- Chip **"Ayer"** junto a "Hoy" (falta) para evitar el date picker nativo.
- **Repetir movimiento**: botón en `TransactionDetailDrawer` que reabre el form precargado.
- Toast **"Deshacer" (4s)** de `sonner` tras guardar, en vez de solo cerrar.
- Tap targets ≥44px; auditar en 3 tamaños (≈360 / ≈430 / ≈800px) con Chrome DevTools MCP + `a11y-debugging`.

**Verificación T1:** `npm run typecheck` + `npm run build`; `npx cap run android`; login (email + Google),
CRUD de movimiento contra backend LAN; auditoría de viewport en 3 tamaños.

---

## Tramo 2 — Offline (Outbox + replay)

> **Corte 1 HECHO** (sin SQLite — ponytail): se usa el mecanismo nativo de React Query v5.
> - Lecturas offline: `PersistQueryClientProvider` + `createSyncStoragePersister` en `src/app/providers.tsx`
>   persiste las QUERIES en localStorage (`gcTime` 24h en `queryClient.ts`). Al reabrir sin red se ven
>   los últimos datos.
> - Alta de gasto offline: update optimista en `useCreateTransaction` (`useTransactionMutations.ts`) — el
>   movimiento se ve al instante; la mutación queda pausada (networkMode online) y React Query la reenvía
>   sola al reconectar. Servidor = fuente de verdad (refetch al reconectar reemplaza el optimista).
>
> **Verificado E2E (Chrome DevTools, viewport mobile 390×844, seed admin):** online create OK;
> offline (navigator.onLine=false + evento offline) → el gasto aparece optimista al instante, el modal
> cierra con aviso "Guardado sin conexión", el backend NO se toca (queda pausado); al volver online la
> mutación se reenvía sola y pega al backend SIN duplicar. Fix aplicado en el camino: offline el submit
> cierra el modal y avisa de una (antes quedaba abierto porque `close()`/toast estaban solo en `onSuccess`).
>
> **Diferido (upgrade documentado, no bloquea el uso diario):**
> - Reanudar mutaciones tras CERRAR la app: persistir mutaciones + `setMutationDefaults` por `mutationKey`,
>   y enviar `id` de cliente en el POST + backend idempotente (T2C). Hoy no se envía `id` (el zod del back
>   podría rechazarlo). Update optimista para editar/borrar offline (hoy solo pausan y aplican al reconectar).
> - SQLite (`@capacitor-community/sqlite`) solo si localStorage se queda corto (>~5MB de historial) o se
>   necesita query local compleja. El corte actual cumple "administrar gastos sin internet".


### T2A · SQLite local  `[ ]`
- `@capacitor-community/sqlite` + `jeep-sqlite` (fallback web dev). Init en `src/main.tsx` antes de montar
  `App` (patrón oficial: `createConnection` → `open` → `CREATE TABLE IF NOT EXISTS`).
- (1) **Caché de lectura**: espejo de `wallets/transactions/categories/budgets` del owner activo (que la app
  abra sin red; hoy React Query es solo memoria). (2) **Outbox**:
  `pending_mutations(id, owner_id, method, endpoint, body_json, created_at, tries, last_error)`.

### T2B · Enganche outbox + replay  `[ ]`
- En `src/config/api.ts` / hooks de mutación: con red → request normal; sin red → `crypto.randomUUID()` +
  escribir fila optimista en SQLite + encolar en outbox.
- Replay: al volver la red (`@capacitor/network`) o al abrir la app, drenar el outbox FIFO contra la API.
  Éxito → borrar de cola + `invalidateQueries`. Error 4xx no reintentable → marcar y avisar.
- **Balance**: mostrar balance derivado local (optimista) pero **no** sincronizarlo; el servidor lo recalcula
  al aplicar el replay (mantiene sus locks `FOR UPDATE`) y el refresh reconcilia.

### T2C · Backend idempotente  `[ ]`
- `POST /api/transactions` debe **aceptar `id` provisto por el cliente** y hacer **upsert-by-id** (replay no
  duplica). Archivos: `Backend/src/features/transactions/transactions.service.ts` + su validación zod.
  `// ponytail: upsert por id de cliente; sin esto el replay puede duplicar`.

**No hacer ahora** (solo para multi-dispositivo real): motor `/sync`, `updatedAt/deletedAt/version` uniformes,
resolución de conflictos. `// ponytail: outbox single-device; migrar a sync engine cuando haya 2+ dispositivos`.

**Verificación T2:** modo avión → CRUD de movimientos (se ven al instante) → cerrar/reabrir (persisten) →
red on → se suben, no duplican, balance del server cuadra. Probar replay con mutación inválida (queda marcada, no bloquea la cola).

---

## Tramo 3 — Compartir + Drive (después)
- **Compartir**: delegación ya existe (back + UI). Necesita **servidor común accesible**: el amigo instala el
  APK, apunta a la misma URL y el owner lo invita por email (SUPERVISOR edita / ASESOR solo lee). Verificar
  end-to-end (el front lo tenía como stub; el back ya lo publica). **Tensión conocida: compartir necesita
  servidor; el offline puro no comparte** — se resuelve con cloud.
- **Drive** (adjuntos): OAuth nativo (deep link `com.financemobile.app:/oauth2redirect`) + swap del flujo. Opcional.
- Limpieza: borrar directorio basura vacío `Backend/D:ProyectosFinanceMobileBackendsrcfeaturesdelegations`.
