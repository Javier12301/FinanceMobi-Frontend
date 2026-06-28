# Contrato Frontend v5 — FinanceMobile
# Diseño UX/UI Mobile-First

> Generado el 2026-06-28. Complementa [`frontend-pendientes-v5.md`](../para-backend/frontend-pendientes-v5.md).
> Foco de v5: **flujos de 4 toques o menos**, módulo social de Eventos y Grupos,
> y Plantillas de acceso rápido. Todos los componentes nuevos siguen el sistema de
> diseño existente (dark mode, paleta ya definida en v3-v4).

---

## 1. FAB Speed-Dial — Dashboard (Plantillas + Accesos rápidos)

El botón `+` flotante del dashboard deja de ser un botón simple y se convierte en un
**speed-dial** expandible. Máximo 4 toques desde el dashboard hasta cargar un gasto.

### Comportamiento

```
Toque 1: El FAB gira (+→×) y despliega el menú hacia arriba
Menú:
  ┌─────────────────────────────────────────────┐
  │  [Chip] ☕ Café $1.500                       │  ← plantillas del usuario
  │  [Chip] ⛽ Nafta                             │  ← monto null → pide al usar
  │  [Chip] 🛒 Super $8.500                      │
  │  ─────────────────────────────────────────  │
  │  ↔  Transferencia                           │
  │  ✏️  Nuevo registro                          │
  └─────────────────────────────────────────────┘
Toque 2: tap en plantilla → abre form prellenado
Toque 3: ajustar monto si es necesario (o confirmar directo)
Toque 4: Guardar
```

- Las plantillas se muestran como chips horizontales scrolleables si son más de 3.
- Tap fuera del speed-dial → cierra sin acción.
- Botón "Gestionar plantillas" (ícono engranaje) en el header del speed-dial → navega a la pantalla de plantillas.

---

## 2. Pantalla de Plantillas

### Lista de plantillas (`/templates`)

- Cards con: **ícono de color** (igual que categorías) + **label** + **monto** (o "Monto variable") + **categoría**.
- FAB `+` → abre modal de nueva plantilla.
- Long-press sobre una card → opciones: Editar / Eliminar.
- Estado vacío con ilustración: "Tus gastos frecuentes a un toque. Creá tu primera plantilla."

### Modal "Nueva / Editar plantilla"

| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| Nombre | Text input | ✅ |
| Ícono | Selector (lucide, igual que categorías) | No |
| Tipo | Toggle GASTO / INGRESO | ✅ |
| Monto | Número o vacío ("Variable") | No |
| Categoría | Selector existente | No |
| Billetera | Selector existente | No |

> **"Guardar como plantilla"** desde el form de nuevo movimiento:
> al final del form de carga de movimiento, checkbox opcional:
> "💾 Guardar como plantilla con estos datos". Si se marca, el sistema crea
> la plantilla automáticamente al guardar la transacción.

---

## 3. Modo Sumadora Rápida — Input de Monto

En cualquier form que tenga un campo de monto (nuevo movimiento, nuevo evento), el input
incluye un botón `+` lateral que activa el modo sumadora.

### Estado normal
```
┌─────────────────────┬───┐
│  $ 0                │ + │
└─────────────────────┴───┘
```

### Estado sumadora activa
```
┌───────────────────────────┐
│  Total: $ 13.500          │  ← actualización en tiempo real
├───────────────────────────┤
│  8.500                    │
│  3.200                    │
│  1.800                    │
│  ──────────────           │
│  [  Agregar ítem  ]       │
│  [  Listo         ]       │
└───────────────────────────┘
```

- Cada fila es un número simple, sin descripción (es una calculadora, no un detalle de factura).
- "Listo" colapsa la sumadora y deja el total en el campo de monto principal.
- Cambiar de modo (sumadora → directo) descarta los ítems parciales con confirm dialog si hay valores cargados.
- Estado local del componente, zero backend.

---

## 4. Pantalla de Grupos (`/groups`)

### Lista de grupos

- Card por grupo: nombre del grupo + avatares de los primeros 4 miembros (fotos de perfil o iniciales) + cantidad de eventos activos.
- FAB `+` → modal "Nuevo grupo" (solo pide nombre).
- Badge en cada card si hay **deudas pendientes** dentro del grupo.

### Detalle de grupo (`/groups/:id`)

Tres tabs:

| Tab | Contenido |
|-----|-----------|
| **Eventos** | Lista de eventos del grupo, ordenados por fecha desc. Badge de estado por evento. |
| **Miembros** | Lista de miembros con rol (Admin / Miembro / Fantasma / Pendiente). Acciones de admin. |
| **Mis deudas** | Vista filtrada: solo las deudas del usuario activo dentro de este grupo. |

#### Tab Miembros — acciones del admin

- **Invitar** → bottom sheet con dos opciones: "Por email" / "Agregar invitado (sin cuenta)".
- **Invitar por email** → input de email + botón enviar. La UI muestra el miembro como "Pendiente" hasta que acepte.
- **Agregar fantasma** → input de nombre (ej. "Mauri Invitado") → se crea al instante.
- **Long-press sobre fantasma** → opción "Vincular a usuario real" → input de email → el backend guarda `claimEmail` y espera confirmación.
- **Long-press sobre miembro** → opciones: Promover a admin / Expulsar del grupo.

---

## 5. Pantalla de Nuevo Evento (`/groups/:id/events/new`)

### Flujo completo en 4 toques

```
Toque 1: Botón "Nuevo evento" en el tab Eventos del grupo
Toque 2: Escribir nombre del evento (teclado) + monto total → Siguiente
Toque 3: Confirmar quién participó (deselección express) + seleccionar acreedor → Siguiente
Toque 4: Revisar split → Guardar
```

### Paso 2 — Monto y nombre

- Input de nombre: "¿Qué fue?" → placeholder "Asado del sábado".
- Input de monto con Modo Sumadora Rápida disponible.
- Selector de billetera del acreedor (billetera donde se registra el gasto).

### Paso 3 — Participantes y acreedor

**Deselección Express:**
```
Todos los miembros del grupo aparecen seleccionados por defecto con avatar + nombre.
Toque sobre cualquier miembro → se desmarca con animación (tachado + opacidad).
Botón "Quién pagó" → selector simple del acreedor (default: el usuario activo).
```

Validación en tiempo real en el botón "Siguiente":
- Mínimo 2 miembros seleccionados (incluyendo acreedor) → si no: botón bloqueado + mensaje.

### Paso 4 — Revisión del split

```
┌────────────────────────────────────────────┐
│  Asado del sábado             Total $45.000│
│  ─────────────────────────────────────────│
│  👤 Javier (vos) — Paga       $15.000 🔒  │
│  👤 Franco                    $15.000  ✏️  │
│  👤 Mauri Invitado            $15.000  ✏️  │
│  ─────────────────────────────────────────│
│  Restante: $0                              │
└────────────────────────────────────────────┘
        [ Guardar evento ]
```

**Split manual (tap en ✏️ de un miembro):**
- Se abre un input inline con el monto de ese miembro.
- Al confirmar, el sistema recalcula el "Restante" y lo distribuye equitativamente entre los
  miembros que NO tienen monto manual.
- Si `suma(manuales) > total` → el campo "Restante" se muestra en rojo y el botón
  "Guardar evento" se bloquea.
- El acreedor (Javier) siempre tiene 🔒 — no tiene deuda, su parte es el gasto neto final.

---

## 6. Vista de Evento (detalle) (`/events/:id`)

```
┌────────────────────────────────────────────┐
│  🍖 Asado del sábado            28 Jun 2026│
│  Total $45.000 · Pagó: Javier              │
│  ─────────────────────────────────────────│
│  👤 Franco          $15.000    [Pagado ✓]  │
│  👤 Mauri Invitado  $15.000    [Debe]  💬  │
│  👤 Vos             $15.000    (tu parte)  │
└────────────────────────────────────────────┘
       [Cancelar evento]  (solo admin/creador)
```

### Badges de estado de deuda por miembro

| Estado | Visual |
|--------|--------|
| `ACTIVE` | Chip rojo "Debe" |
| `PARTIALLY_PAID` | Chip naranja "Pago parcial" |
| `PENDING_CONFIRMATION` | Chip amarillo "Por confirmar" |
| `PAID` | Chip verde "Pagado ✓" |
| `FORGIVEN` | Chip lavanda "Perdonada" |
| `SETTLED_EXTERNALLY` | Chip gris "Saldada fuera" |
| `FROZEN` | Chip gris oscuro "Congelada" + ícono ❄️ |
| `CANCELLED` | Chip gris "Cancelada" |

### Acciones por deuda (según rol y estado)

**Si sos el deudor:**
- `ACTIVE / PARTIALLY_PAID` → botón "Declarar pago" → input de monto → confirmar
- `FROZEN` → botón "Marcar como saldada fuera de la app" → confirm dialog
- `PENDING_CONFIRMATION` (hace más de 3 días) → botón "Forzar cierre"

**Si sos el acreedor:**
- `PENDING_CONFIRMATION` → botones "Confirmar pago" / "Rechazar"
- `ACTIVE / PARTIALLY_PAID` → botón "Condonar deuda" → confirm dialog
  → la deuda pasa a `FORGIVEN` con badge lavanda "Perdonada"

---

## 7. Pop-up de Claim de Fantasma

Aparece automáticamente en el dashboard al iniciar sesión si hay un `pendingGhostClaim`
para el email del usuario:

```
┌─────────────────────────────────────────────────────┐
│   👥  Invitación a un grupo                          │
│                                                     │
│   Javier te agregó al grupo "Asado del sábado"      │
│   como "Mauri Invitado". Tenés 2 deudas pendientes. │
│                                                     │
│   Al aceptar, tu historial y deudas en ese grupo    │
│   quedarán vinculados a tu cuenta.                  │
│                                                     │
│   [ Rechazar ]              [ Aceptar y vincular ]  │
└─────────────────────────────────────────────────────┘
```

- Si rechaza → el fantasma queda sin vincular, las deudas siguen como estaban.
- Si acepta → migración atómica en el backend, el pop-up no vuelve a aparecer.
- Si hay múltiples claims pendientes → se muestran en secuencia (uno por sesión).

---

## 8. Ajuste de Saldo Manual — Billetera

Accesible desde el detalle de cada billetera, botón secundario "Ajustar saldo":

```
┌─────────────────────────────────────────────┐
│  Ajustar saldo — Efectivo                   │
│                                             │
│  Saldo actual: $12.400                      │
│                                             │
│  Nuevo saldo real:  [ $            ]        │
│                                             │
│  El sistema creará una transacción de       │
│  ajuste automático para equilibrar la       │
│  diferencia. Esta transacción NO afecta     │
│  tus estadísticas ni gráficos.              │
│                                             │
│           [ Cancelar ]  [ Confirmar ]       │
└─────────────────────────────────────────────┘
```

- La transacción resultante aparece en el historial con ícono ⚖️ y label "Ajuste de saldo".
- Visualmente diferenciada (color de fondo distinto, nunca suma a los gráficos).

---

## 9. Notificaciones de v5 (extensión de v4)

Nuevos disparadores a agregar al job nocturno de v4:

| Trigger | Mensaje push | Cuándo |
|---------|-------------|--------|
| **Deuda en grupo creada** | "Franco creó un evento: Asado $45.000. Te corresponden $15.000" | Al crear el evento |
| **Deudor declara pago** | "Mauri dice que te pagó $15.000 en Asado del sábado" | Al llamar `/pay` |
| **Acreedor confirma** | "Javier confirmó tu pago de $15.000 ✓" | Al llamar `/confirm` |
| **Recordatorio de deuda grupal** | "Todavía debés $15.000 a Javier por Asado del sábado 🍖" | Cada 48hs si `ACTIVE` |
| **Deuda congelada** | "Javier abandonó el grupo. Podés marcar tu deuda como saldada." | Al detectar acreedor sin leftAt |

> Aplica solo a usuarios reales. `if (member.ghostId) return;`

---

## 10. Resumen de pantallas nuevas en v5

| Pantalla | Ruta | Estado |
|----------|------|--------|
| Lista de grupos | `/groups` | Nueva |
| Detalle de grupo | `/groups/:id` | Nueva |
| Nuevo evento | `/groups/:id/events/new` | Nueva |
| Detalle de evento | `/events/:id` | Nueva |
| Lista de plantillas | `/templates` | Nueva |
| (Pop-up claim fantasma) | Dashboard | Nuevo componente overlay |
| (FAB speed-dial) | Dashboard | Reemplaza FAB existente |
| (Ajuste de saldo) | Detalle billetera | Botón + modal nuevos |

---

## 11. Criterio de degradación elegante

Todos los features de v5 que dependen de backend nuevo degradan a estado vacío
o estado deshabilitado usando `isNotAvailable()` en `src/config/api.ts` (ya existe):

- Si `/api/groups` → 404/501: la tab "Grupos" muestra "Próximamente" y no navega.
- Si `/api/events` → 404/501: botón "Nuevo evento" oculto.
- Si `/api/wallets/:id/adjust` → 404/501: botón "Ajustar saldo" oculto.
- Plantillas: siempre disponibles (localStorage, sin dependencia de backend).
