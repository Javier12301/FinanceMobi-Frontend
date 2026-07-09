# Contratos que el frontend espera para v5 — FinanceMobile

> Generado el 2026-06-28, tras cerrar la planificación de v4.
> La gran evolución de v5 es el módulo de **Eventos y Gastos Compartidos** (sociales, entre amigos/grupos)
> junto con mejoras de UX mobile-first y el sistema de **Plantillas de acceso rápido**.
>
> Base: [`frontend-pendientes-v4.md`](./frontend-pendientes-v4.md) ·
> UX/diseño detallado: [`contrato-frontend-v5.md`](../para-front/contrato-frontend-v5.md).

---

## 0. Resumen ejecutivo

v5 es la versión **social y de retención avanzada**. El riesgo que ataca es distinto al de v4: ya hay
usuarios activos que cargan habitualmente, ahora hay que **engancharlo a su círculo social** para que
la app sea indispensable. Todo lo de abajo está ordenado por impacto en esa dirección.

| Prioridad | Tema | Estado backend | Por qué mueve la aguja |
|-----------|------|----------------|------------------------|
| 🔴 Alta | **Grupos de usuarios** (`/api/groups`) | No existe | Base de toda la capa social. Sin esto nada del módulo de eventos funciona. |
| 🔴 Alta | **Eventos y gastos compartidos** (`/api/events`) | No existe | El diferencial real de v5. Reemplaza a Splitwise dentro de la app. |
| 🔴 Alta | **Miembros Fantasma (invitados sin cuenta)** | No existe | Elimina la fricción de "todos deben instalar la app antes de usarla". |
| 🟡 Media | **Plantillas de gasto rápido** (`/api/templates` o localStorage) | No existe | Acceso de 1 toque a gastos frecuentes. Puede arrancar en cliente. |
| 🟡 Media | **Ajuste de Saldo Manual** (`POST /api/wallets/:id/adjust`) | No existe | Corrección de billetera en 1 paso. Necesario como válvula de escape del módulo de eventos. |
| 🟢 Baja | **Invitación a roles Asesor/Supervisor por email** | No existe | Mejora el flujo de delegación existente (v1+). |

---

## 1. 🔴 Grupos de usuarios — `/api/groups`

La entidad central que contiene miembros (reales y fantasma) y agrupa los Eventos.

### Modelo `Group`

```typescript
{
  id: string
  name: string                   // "Amigos del asado", "Casa compartida"
  createdByUserId: string
  createdAt: string
  members: GroupMember[]
}
```

### Modelo `GroupMember`

```typescript
{
  id: string
  groupId: string
  role: "ADMIN" | "MEMBER"

  // Exactamente uno de los dos debe estar presente:
  userId: string | null          // usuario real registrado en FinanceMobile
  ghostId: string | null         // miembro fantasma (ver §3)

  joinedAt: string
  leftAt: string | null          // null si está activo
}
```

> **Regla de administración automática:** si el último admin abandona el grupo,
> el backend promueve automáticamente al `GroupMember` con `joinedAt` más antiguo
> que no tenga `leftAt`. Una sola query: `ORDER BY joinedAt ASC LIMIT 1`.

### Endpoints

| Método | Ruta | Uso |
|--------|------|-----|
| `GET` | `/api/groups` | Mis grupos (donde soy miembro activo) |
| `POST` | `/api/groups` | Crear grupo |
| `GET` | `/api/groups/:id` | Detalle del grupo + miembros |
| `PUT` | `/api/groups/:id` | Editar nombre |
| `DELETE` | `/api/groups/:id` | Disolver grupo (solo admin; valida deudas pendientes) |
| `POST` | `/api/groups/:id/members` | Invitar miembro (real por email o fantasma por nombre) |
| `DELETE` | `/api/groups/:id/members/:memberId` | Abandonar grupo o expulsar miembro |
| `PUT` | `/api/groups/:id/members/:memberId/role` | Promover/degradar rol |

**POST body para invitar miembro:**
```json
// Invitar usuario real (dispara email de invitación):
{ "email": "amigo@email.com" }

// Crear fantasma (nombre de referencia local):
{ "ghostName": "Mauri Invitado" }
```

---

## 2. 🔴 Invitaciones de grupo por email

### Flujo completo

```
Admin invita email → backend crea token con TTL 72hs → envía email con link de aceptación
→ usuario hace clic → acepta o rechaza → backend agrega/descarta el GroupMember
```

### Endpoint de invitación

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/groups/:id/invitations` | Crear invitación (body: `{ email }`) |
| `GET` | `/api/invitations/:token` | Validar token (verifica expiración) |
| `POST` | `/api/invitations/:token/accept` | Aceptar → crea `GroupMember` con `userId` |
| `POST` | `/api/invitations/:token/reject` | Rechazar → invalida token |

**Seguridad obligatoria:**
- Token JWT firmado con TTL de **72 horas**. Token expirado → `410 Gone`.
- **Rate limiting:** máximo 10 invitaciones por usuario por hora para evitar spam de emails.
- El estado del miembro invitado queda como `PENDING` hasta que acepte o el token expire.

**Caso: email no registrado aún**
Si el email invitado no existe en el sistema, el link de aceptación redirige al registro.
Al completar el registro, el backend detecta `pendingInvitation` para ese email y agrega
automáticamente al usuario como miembro del grupo. Cero fricción extra.

---

## 3. 🔴 Miembros Fantasma (Invitados sin cuenta)

Para no bloquear el uso del módulo social hasta que todos los amigos tengan cuenta.

### Modelo `GhostMember`

```typescript
{
  ghostId: string                // UUID generado por el backend — nunca el nombre
  groupId: string
  displayName: string            // "Mauri Invitado" — solo referencia visual
  claimEmail: string | null      // email que el admin propuso para vincularlo (pendiente de confirmar)
  linkedUserId: string | null    // se llena después del claim exitoso
  createdAt: string
}
```

### Flujo de Claim (vincular fantasma → usuario real)

El admin propone un email desde los ajustes del grupo. El sistema **no hace nada automáticamente**:

```
Admin ingresa email del fantasma → backend guarda claimEmail en GhostMember (estado: PENDING_CLAIM)
→ la próxima vez que ese email inicie sesión (o al registrarse), aparece un pop-up:
  "Javier te agregó al grupo 'Asado del sábado' como Mauri Invitado. ¿Aceptar historial y deudas?"
→ Usuario acepta → backend ejecuta migración atómica:
    UPDATE debts SET counterpartyGhostId = NULL, counterpartyUserId = :realUserId
    WHERE counterpartyGhostId = :ghostId
    UPDATE group_members SET userId = :realUserId, ghostId = NULL
    DELETE FROM ghost_members WHERE ghostId = :ghostId
→ Transacción completa. El fantasma desaparece, el usuario real hereda todo el historial.
```

**Si el email aún no tiene cuenta:** el `pendingClaim` queda guardado. Al momento del registro,
el mismo sistema de detección de invitaciones pendientes dispara el pop-up de claim.

**Notificaciones para fantasmas:** `if (member.ghostId) return;` — nunca se intentan push
a fantasmas. El admin gestiona el contacto por medios externos (WhatsApp, etc.).

---

## 4. 🔴 Eventos y gastos compartidos — `/api/events`

Un **Evento** es un gasto grupal con nombre (ej. "Asado del sábado", "Cena cumpleaños").
Agrupa N deudas individuales bajo un mismo `eventId`.

### Modelo `Event`

```typescript
{
  id: string
  groupId: string
  name: string                   // "Asado del sábado"
  totalAmount: string            // decimal-string — monto total pagado
  createdByUserId: string        // quien registró el evento
  creditorMemberId: string       // GroupMember al que le deben (puede ser distinto al creador)
  creditorWalletId: string       // billetera que absorbe el gasto y recibe los pagos
  status: "ACTIVE" | "CANCELLED"
  createdAt: string
  updatedAt: string
  debts: EventDebt[]             // N deudas individuales
}
```

### Modelo `EventDebt` (extensión del modelo `Debt` de v4)

Se agrega el campo `eventId?: string` al modelo `Debt` existente. Una `EventDebt` es simplemente
una `Debt` que tiene `eventId` poblado.

```typescript
// Campos nuevos que se agregan al modelo Debt de v4:
{
  eventId: string | null          // si pertenece a un evento grupal
  counterpartyGhostId: string | null  // si el deudor es un fantasma
  // counterpartyUserId ya existe implícitamente en el modelo v4
}

// Estado extendido (se agregan a los existentes ACTIVE | PAID):
status: "ACTIVE" | "PARTIALLY_PAID" | "PAID" | "FORGIVEN" | "SETTLED_EXTERNALLY" | "FROZEN" | "CANCELLED"
```

### Algoritmo de creación de un Evento

Al hacer `POST /api/events`, el backend ejecuta en una sola transacción:

1. Crea el registro `Event`.
2. Registra una `Transaction` de tipo `EXPENSE` en `creditorWalletId` por `totalAmount`.
3. Para cada miembro seleccionado en el split (excepto el acreedor):
   - Calcula su parte: `floor(totalAmount / cantMiembros)` — enteros, sin centavos.
   - El peso residual se descarta (en ARS los centavos no existen en la práctica).
   - Crea una `Debt` con `eventId` + `direction: OWED_TO_ME` desde la perspectiva del acreedor.

### Endpoints de Eventos

| Método | Ruta | Uso |
|--------|------|-----|
| `GET` | `/api/groups/:id/events` | Historial de eventos del grupo |
| `POST` | `/api/groups/:id/events` | Crear evento (dispara el algoritmo de §4) |
| `GET` | `/api/events/:id` | Detalle del evento + estado de cada deuda |
| `DELETE` | `/api/events/:id` | Cancelar evento (ver lógica de cancelación abajo) |

**POST body:**
```json
{
  "name": "Asado del sábado",
  "totalAmount": 45000,
  "creditorMemberId": "member-uuid",
  "creditorWalletId": "wallet-uuid",
  "splits": [
    { "memberId": "member-uuid-juan" },
    { "memberId": "member-uuid-mauri" },
    { "memberId": "member-uuid-ghost-1", "manualAmount": 8000 }
  ]
}
```

> `manualAmount` opcional: si se setea, ese miembro tiene monto fijo y el resto
> divide el remanente en partes iguales. La UI valida que `suma(manualAmounts) < totalAmount`
> antes de habilitar el botón Guardar.

### Lógica de cancelación de Evento

```
Si status == CANCELLED:
  1. Marcar Event.status = 'CANCELLED'
  2. UPDATE debts SET status = 'CANCELLED'
     WHERE eventId = :id AND status NOT IN ('PAID', 'FORGIVEN', 'SETTLED_EXTERNALLY')
  3a. Si NINGUNA deuda había sido pagada → generar Transaction de contra-asiento
      (INCOME por totalAmount en creditorWalletId) para anular el GASTO original.
  3b. Si había pagos parciales → NO tocar el GASTO original.
      El acreedor usa Ajuste de Saldo Manual si necesita corregir su billetera.
```

---

## 5. 🔴 Pagos de deudas (extensión del endpoint v4)

El endpoint `POST /api/debts/:id/pay` existente de v4 debe soportar:

### Pagos parciales

```json
// Body
{ "walletId": "uuid", "amount": 3000 }
// Si amount < remaining → status = "PARTIALLY_PAID", remaining se actualiza
// Si amount >= remaining → status = "PAID", remaining = 0
```

### Flujo de confirmación bilateral

1. **Deudor** llama `POST /api/debts/:id/pay` → deuda pasa a `PENDING_CONFIRMATION`.
2. **Acreedor** llama `POST /api/debts/:id/confirm` → deuda pasa a `PAID`, se registra INCOME en su wallet.
3. **Si el acreedor no confirma en 3 días**, el deudor puede llamar `POST /api/debts/:id/force-close`
   → estado pasa a `SETTLED_EXTERNALLY`. No mueve caja del acreedor.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/debts/:id/pay` | Deudor declara pago (total o parcial) |
| `POST` | `/api/debts/:id/confirm` | Acreedor confirma recepción |
| `POST` | `/api/debts/:id/force-close` | Deudor fuerza cierre tras 3 días sin confirmación |
| `POST` | `/api/debts/:id/forgive` | Acreedor condona la deuda → status `FORGIVEN` |

**Deuda congelada (acreedor abandonó el grupo):**
Si `creditor.leftAt != null`, la deuda pasa a status `FROZEN`. El deudor tiene habilitado
directamente el botón "Marcar como saldada fuera de la app" → `POST /api/debts/:id/force-close`.
No requiere confirmación de nadie.

---

## 6. 🟡 Ajuste de Saldo Manual — `POST /api/wallets/:id/adjust`

Permite al usuario corregir el saldo real de una billetera en un paso, sin cargar
transacciones manualmente. Útil como válvula de escape tras eventos grupales complejos.

```typescript
// POST /api/wallets/:id/adjust
// Body:
{ "targetBalance": 85000 }

// El backend calcula la diferencia:
// delta = targetBalance - wallet.currentBalance
// Si delta > 0 → crea Transaction { type: "ADJUSTMENT", movementType: "INCOME",  amount: delta }
// Si delta < 0 → crea Transaction { type: "ADJUSTMENT", movementType: "EXPENSE", amount: abs(delta) }
// Actualiza wallet.balance = targetBalance
```

**Regla crítica para analytics:** las transacciones con `type: "ADJUSTMENT"` se excluyen
de todos los cálculos de insights, gráficos y estadísticas (`WHERE type != 'ADJUSTMENT'`).
Solo impactan el balance de la billetera. Visualmente llevan un ícono distinto en el historial.

---

## 7. 🟡 Plantillas de gasto rápido — `localStorage` primero, `/api/templates` después

"Café", "Nafta", "Super": acceso de 1 toque con monto + categoría + billetera precargados.

```typescript
// Modelo Template
{
  id: string
  label: string                  // "Café"
  movementType: "INCOME" | "EXPENSE"
  amount: string | null          // null = el usuario lo ingresa al usar la plantilla
  categoryId: string | null
  walletId: string | null
  icon: string | null            // clave lucide
  createdAt: string
}
```

**Estrategia de implementación:**
- **V5:** `localStorage` puro en el frontend. Zero backend. Funciona offline.
- **V5.1+:** migrar a `/api/templates` (GET/POST/DELETE) cuando se necesite sincronización
  entre dispositivos.

**Integración con el FAB del dashboard:** el botón `+` se convierte en un speed-dial que
muestra las plantillas guardadas como chips horizontales + las opciones "Nuevo registro"
y "Transferencia". Ver [`contrato-frontend-v5.md §1`](../para-front/contrato-frontend-v5.md).

---

## 8. 🟢 Invitación a roles Asesor/Supervisor por email

Extensión del sistema de roles existente (v1+) para invitar via email en lugar de
requerir que el asesor/supervisor ya tenga cuenta.

Reutiliza exactamente el mismo mecanismo de invitaciones de grupos (§2):
- Token JWT con TTL 72hs
- Rate limiting
- Link de aceptación que funciona tanto para usuarios existentes como para nuevos registros

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/me/invitations/advisor` | Invitar asesor por email |
| `POST` | `/api/me/invitations/supervisor` | Invitar supervisor por email |
| `POST` | `/api/invitations/:token/accept` | Mismo endpoint unificado de §2 |

---

## 9. Estados extendidos del modelo Debt (resumen)

Consolidación de todos los estados válidos en v5:

| Estado | Quién lo setea | Significado |
|--------|---------------|-------------|
| `ACTIVE` | Backend al crear | Deuda vigente, sin pagos |
| `PARTIALLY_PAID` | Backend al recibir pago parcial | Hay saldo pendiente |
| `PENDING_CONFIRMATION` | Backend cuando deudor declara pago | Esperando confirmación del acreedor |
| `PAID` | Backend cuando acreedor confirma | Saldada completamente |
| `FORGIVEN` | Acreedor via `/forgive` | Condonada — el acreedor asume el gasto |
| `SETTLED_EXTERNALLY` | Deudor via `/force-close` | Pagada fuera de la app |
| `FROZEN` | Backend cuando acreedor abandona grupo | Sin acreedor activo para confirmar |
| `CANCELLED` | Backend al cancelar el Evento | El evento fue anulado |

---

## 10. Dónde toca en el frontend cuando lleguen los contratos

| Contrato | Ajustar en |
|----------|------------|
| `/api/groups` | nuevo `src/features/groups/` |
| `/api/groups/:id/invitations` | `src/features/groups/api/useGroupInvitations.ts` |
| Miembros fantasma + claim | `src/features/groups/components/GhostMemberClaim.tsx`, pop-up en `DashboardPage` |
| `/api/events` | nuevo `src/features/events/`, accesible desde pantalla de grupo |
| Estados de Debt extendidos | `src/features/debts/` — actualizar tipos y badges visuales |
| `/api/debts/:id/confirm`, `/force-close`, `/forgive` | `src/features/debts/api/useDebtActions.ts` |
| `/api/wallets/:id/adjust` | `src/features/wallets/` — botón "Ajustar saldo" en detalle de billetera |
| Plantillas (localStorage) | nuevo `src/features/templates/`, FAB speed-dial en `DashboardPage` |
| Invitaciones asesor/supervisor | `src/features/auth/` — sección Ajustes |
| `type: ADJUSTMENT` en historial | `src/features/transactions/` — ícono + filtro en analytics |
| Criterio de endpoint dormido | `isNotAvailable()` en `src/config/api.ts` (ya existe) |
