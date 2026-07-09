# Plan UX: nav/FAB, Plan mensual, recurrentes y categorías

> Objetivo: bajar la confusión de la pantalla Plan (3 botones poco claros + FAB flotante),
> hacer manejable la recurrencia desde donde el usuario la ve, y evitar el caos de categorías.
> Interfaz clara **para todas las edades**, no solo jóvenes. Ordenado por **riesgo**.

## Decisiones tomadas con el usuario
- **Nav**: 4 pestañas + **'+' central elevado** (Inicio · Billeteras · **(+)** · Plan · Ajustes). "Movimientos" se accede desde Inicio → "Ver todas →".
- **Menú del '+'**: acciones existentes ahora (Registrar movimiento · Registrar deuda · Nuevo fijo). Plantillas típicas = después.
- **Recurrentes**: enfoque **"visible + borrable"** (NO auto-revertir al editar la regla). Se necesita vincular Transaction↔Regla en backend (solo lectura), mostrar la recurrencia al editar y permitir pausar/quitar; deshacer el cobro = **borrar ese movimiento** (el DELETE ya revierte el balance).

---

## TIER 1 — Seguro y de alto valor (frontend, no toca dinero). ✅ HECHO Y VERIFICADO
> Nav: 4 pestañas + '+' central elevado (`BottomNav.tsx` + `QuickActionsSheet.tsx`) con sheet
> "¿Qué querés registrar?" (Registrar movimiento / Movimiento fijo / Deuda). Plan: '+' contextual
> por tablero (`PlanPage.tsx`), botones confusos eliminados; abre el form con tipo+repetir precargados
> vía `useTransactionModal.openNew(defaults)` (base nueva) y `useDebtModal` (deuda global en MainLayout).
> Categorías: `CategoryPicker` dedupea el grid duplicado + buscador (>8 categorías). typecheck+build OK,
> verificado con Chrome DevTools (viewport mobile).

### 1.1 · Nav con '+' central + menú de acciones
- `src/components/layouts/navItems.ts`: reducir a 4 (Inicio, Billeteras, Plan, Ajustes) con un slot central para la acción.
- `src/components/layouts/BottomNav.tsx`: el FAB deja de flotar (`fixed bottom-20`) y pasa a ser el **botón central elevado** dentro de la barra. Al tocarlo abre un **bottom sheet de acciones** (usar `sheet.tsx` ya instalado, o `dropdown-menu.tsx`): "Registrar movimiento" · "Registrar deuda" · "Nuevo fijo". Ocultarlo si `isReadOnly` (ya se hace).
- `src/components/layouts/Sidebar.tsx`: equivalente desktop (mismo `navItems`); en desktop el '+' puede seguir como botón normal arriba.
- En Inicio (`DashboardPage`), reforzar el acceso a Movimientos ("Ver todas →" ya existe).

### 1.2 · Registrar desde cada tablero de Plan (con contexto)
- Extender el store `src/features/transactions/useTransactionModal.ts`: `open()` debe aceptar **defaults opcionales** (`movementType`, `repeat: true`, `dayOfMonth`). Additivo, no rompe llamadas existentes.
- `src/pages/PlanPage.tsx`: cada `Section` con su acción de alta:
  - "Ingresos fijos" → `open({ movementType: 'INCOME', repeat: true })`
  - "Gastos fijos" → `open({ movementType: 'EXPENSE', repeat: true })`
  - "Deudas y préstamos" → abrir `DebtFormModal`.
  Quitar los 2 botones globales confusos del header ("Movimiento fijo" / "Deuda").
- `src/features/transactions/components/TransactionMobileForm.tsx` y `TransactionFormModal.tsx`: al abrir con defaults, preseleccionar tipo + activar el switch "Repetir cada mes".
- `DebtFormModal`: hoy es local a PlanPage; puede quedarse local (lo abre la Section de deudas) — no hace falta store global.

### 1.3 · Buscador de categorías + dedupe del grid
- `npx shadcn@latest add command popover` → `src/components/ui/command.tsx`, `popover.tsx`.
- **Extraer** el `CategoryGrid` hoy **duplicado literal** en `TransactionMobileForm.tsx:492-621` y `TransactionFormModal.tsx:379-510` a un único `src/features/categories/components/CategoryPicker.tsx`.
- El picker: grid de íconos como ahora, **+ campo de búsqueda** (combobox `command`) que aparece/filtra cuando hay muchas categorías (ej. > 8). Mantener alta inline "+ Nueva" y filtrado por `movementType`.
- Reutilizar `CATEGORY_ICONS`/`CATEGORY_COLORS` de `src/features/categories/categoryMeta.ts`.

---

## TIER 2 — Bajo riesgo, backend aislado.

### 2.1 · Categorías (e ingresos) por defecto también en login Google
- Hoy `registerWithCredentials` (`Backend/src/features/auth/auth.service.ts:72-113`) **ya siembra** `DEFAULT_CATEGORIES` (Comida, Transporte, Servicios, Supermercado, Salud, Ocio, Sueldo, Otros) + wallet "Efectivo". `loginWithGoogle` (`auth.service.ts:40-59`) **NO** → un usuario nuevo por Google queda vacío (bug).
- Fix: extraer `seedDefaultUserData(tx, userId)` y llamarla en ambas ramas, envolviendo la creación de usuario de Google en `prisma.$transaction`. Additivo.
- Opcional: revisar el set por defecto (agregar "Compras" si se quiere; el resto ya cubre lo típico).

---

## TIER 3 — Migración en tabla de dinero (additiva). ✅ HECHO Y VERIFICADO
> Migración `add_recurring_rule_id_to_transaction` aplicada: `Transaction.recurringRuleId String?`.
> `confirmRuleAtomically` setea el vínculo al cobrar; se expone solo en la API (findMany sin select).
> Front: `RecurringBanner` ("Este movimiento se repite" + Pausar/Quitar) en la edición de ambos forms cuando
> `editing.recurringRuleId`. Deshacer un cobro puntual = borrar el movimiento (DELETE revierte balance).
> Verificado E2E: una regla vencida al confirmar genera una Transaction **con recurringRuleId** apuntando a
> la regla. NOTA operativa: tras la migración hubo que regenerar el Prisma Client y **reiniciar el backend**
> (el server corriendo tenía el engine .dll bloqueado — EPERM). El backend quedó reiniciado y sano.


> ⚠️ El auto-revert (lo que "podía romper todo") **quedó descartado**. Lo de acá es una columna
> nullable additiva + exponerla; sin lógica nueva de balance (deshacer = DELETE existente).

### 3.1 · Vincular Transaction ↔ RecurringRule
- `Backend/prisma/schema.prisma:145`: agregar `recurringRuleId String?` (+ relación opcional) a `Transaction`. **Migración Prisma** (columna nullable → segura sobre datos existentes).
- `Backend/src/features/recurring/recurring.service.ts:160-170` (`confirmRuleAtomically`): setear `recurringRuleId` al crear la Transaction del cobro.
- Exponer `recurringRuleId` en la respuesta de `GET/POST /api/transactions` (serialización), como ya se hace con `debtId`.

### 3.2 · Manejar la recurrencia desde la edición del movimiento (frontend)
- `src/features/transactions/types/transaction.ts`: agregar `recurringRuleId?: string | null`.
- `TransactionMobileForm.tsx` / `TransactionFormModal.tsx`: en modo `isEdit`, si `editing.recurringRuleId`, mostrar un aviso claro **"Este movimiento se repite cada mes"** con acciones: **"Pausar recurrencia"** / **"Quitar recurrencia"** (usa `useUpdateRecurringRule({active:false})` / `useDeleteRecurringRule`, ya existen). Texto explícito para que un usuario mayor entienda por qué le apareció el cobro.
- Deshacer el cobro puntual = **borrar ese movimiento** (el `DELETE /transactions/:id` ya revierte balance — verificado, responde 204). Asegurar que el botón borrar sea visible/entendible en el detalle.

### 3.3 · (Opcional, misma zona) corregir `updateRule`
- `recurring.service.ts:85-99` (`updateRule`) no recalcula `nextRunDate` al cambiar `dayOfMonth` → puede dejar la próxima corrida desalineada. Recalcular `nextRunDate` de forma consistente hacia adelante. Bajo riesgo, pero es lógica de fechas: cubrir con un test.

---

## Orden sugerido
1. **Tier 1** completo (visual, alto impacto, sin riesgo de datos) — implementadores Haiku por pieza (nav, Plan, categorías).
2. **Tier 2** (Google seed) — un Haiku backend, chico.
3. **Tier 3** (migración + edición recurrente) — el orquestador diseña la migración y el contrato; Haiku implementa con verificación E2E (crear regla → cobrar → editar/pausar/borrar).

**Verificación**: `npm run typecheck` + build (front); Chrome DevTools viewport mobile para el nav y el picker; para Tier 3, prueba E2E del ciclo recurrente con el seed admin.
