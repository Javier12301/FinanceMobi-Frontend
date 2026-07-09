# Mejoras UX, retención y accesibilidad — v4

> Documento de producto/UX/UI. No es código. Pensado sobre la UI ya implementada en v1–v3
> (login, dashboard con quick-add, billeteras, movimientos, categorías icon/color, recurrentes,
> presupuestos, delegación, Drive).
> Continúa [`mejoras-ux-y-roadmap.md`](./mejoras-ux-y-roadmap.md). Lo que necesita backend está en
> [`../para-backend/frontend-pendientes-v4.md`](../para-backend/frontend-pendientes-v4.md).

---

## 0. El problema de v4: la curva de abandono

v1–v3 resolvieron **"se puede cargar un gasto rápido"**. El problema de v4 es distinto y más peligroso:

> Las apps de finanzas personales no mueren el día 1. Mueren entre la **semana 2 y 4**, cuando la novedad
> pasa y cargar deja de sentirse útil. El usuario no borra la app: simplemente deja de abrirla.

Tres palancas contra eso, en orden de impacto:

1. **Arrancar con valor, no con vacío** (onboarding). Ataca el día 1.
2. **Volver a traer al usuario** (notificaciones, racha). Ataca la semana 2–4.
3. **Dar propósito a cada carga** (insights, presupuestos visibles). Ataca el "¿para qué sigo anotando?".

**Métrica-norte (no cambió):** % de días con al menos 1 movimiento cargado por usuario.

---

## 1. 🔴 Onboarding: que el primer minuto deje algo

Hoy el usuario nuevo ve un dashboard 100% vacío (confirmado en pruebas: $0, sin billeteras, sin categorías).
Eso es abandono programado.

| # | Mejora | Dónde | Esfuerzo |
|---|--------|-------|----------|
| 1.1 | **Seed por defecto** (1 billetera + categorías). El usuario aterriza en algo tocable. | Backend (ver pendientes-v4 §1). Front: cero cambios. | — |
| 1.2 | **Mini-tour de 1 pantalla**: al primer login, un overlay "Cargá tu primer gasto" que apunta al botón Registrar. Una vez. | `src/pages/DashboardPage.tsx` + flag en `localStorage` | S |
| 1.3 | **Primer gasto guiado**: si no hay ningún movimiento, el dashboard muestra un CTA grande "Cargá tu primer gasto" en vez de tarjetas vacías. | `DashboardPage`, reusar `EmptyState` con acción | S |
| 1.4 | **Checklist de arranque** (3 ítems): "✅ Creá una billetera · ⬜ Cargá un gasto · ⬜ Activá un recordatorio". Desaparece al completarse. | nuevo componente en dashboard | M |

> Principio: **nunca mostrar una pantalla vacía sin una acción obvia.** Ya hay `EmptyState`; que todos
> tengan un botón, no solo texto.

---

## 2. 🔴 Volver a traer al usuario (semana 2–4)

Lo predecible no se carga a mano (v3, recurrentes). Lo **olvidado** necesita un empujón.

| # | Mejora | Necesita backend | Esfuerzo front |
|---|--------|------------------|----------------|
| 2.1 | **Recordatorio diario push** "¿Gastaste algo hoy?" a una hora elegida. | Sí (device token + cron) | S (Capacitor Push + sección Ajustes) |
| 2.2 | **Racha 🔥** visible: chip "6 días" en el dashboard. Mantenerla se vuelve el juego. | Sí (`GET /api/me/stats`) | S |
| 2.3 | **Aviso de racha en riesgo**: push a las 22:00 si no cargó hoy. | Sí (cron) | — |
| 2.4 | **Recap semanal**: domingo a la noche, tarjeta/push "Esta semana gastaste $X en Y". | Parcial (insights) | M |

La racha (2.2) es la de mejor relación impacto/esfuerzo: un número que sube y el usuario no quiere ver
caer. Honesta (no inventa nada) y barata de calcular.

---

## 3. 🟡 Dar propósito: que cargar sirva para algo

| # | Mejora | Dónde | Esfuerzo |
|---|--------|-------|----------|
| 3.1 | **Tarjeta "Tu mes"**: "Gastaste 12% más que en mayo" + top 3 categorías. | `src/features/summary/`, usa `GET /api/insights` | M |
| 3.2 | **Saldo proyectado** a fin de mes usando recurrentes activas. Diferencial fuerte ya que v3 trajo reglas. | `DashboardPage`, front computa desde `useRecurringRules()` | M |
| 3.3 | **Presupuestos más visibles**: hoy la barra está en el resumen; subirla y avisar al 80%/100%. | `src/features/budgets/`, dashboard | S |
| 3.4 | **Búsqueda de movimientos**: filtro por texto/categoría/fecha. Trivial en cliente hoy; server-side cuando crezca. | `TransactionsPage` | S |
| 3.5 | **Exportar CSV**: un botón, 100% cliente, cero backend. Útil para respaldo/contador. | `TransactionsPage` | S |

---

## 4. 🟡 Pulido de interfaz — mobile y desktop

La app es responsive (un patrón, no pantallas duplicadas). Afinar ambos lados:

### Mobile
- **Tap targets ≥ 44px**: revisar los íconos chicos de editar/eliminar (categorías, billeteras) que vienen
  del diseño desktop. Auditar con la skill `chrome-devtools-mcp:a11y-debugging`.
- **Teclado numérico al instante**: al abrir Registrar, foco en el monto con `inputmode="decimal"` (roadmap §1.1).
- **FAB siempre alcanzable**: el "+ gasto" con el pulgar, sin estirar. Ya hay BottomNav+FAB en mobile.
- **Safe areas**: respetar notch/barra inferior en iOS (env(safe-area-inset-*)).

### Desktop
- **Atajos de teclado**: `N` = nuevo movimiento, `/` = buscar, `Esc` = cerrar modal. Power-users cargan más rápido.
- **Aprovechar el ancho**: el dashboard ya usa grilla 60/40; sumar la tarjeta "Tu mes" e insights sin que quede vacío a la derecha.
- **Hover states claros** en filas de transacción y billetera (feedback de que son clickeables).

### Ambos
- **Optimistic updates**: reflejar el gasto en el balance al instante y reconciliar con el server
  (TanStack Query lo soporta). Sensación de velocidad → más cargas.
- **Deshacer en vez de confirmar**: tras guardar/borrar reversible, toast "Deshacer" (4s). El modal de
  confirmación se reserva para lo irreversible (borrar billetera con datos).

---

## 5. 🎨 Accesibilidad de color — fallos medidos (acción concreta)

Medí los contrastes reales de los tokens de `src/index.css` (no estimados). **Modo oscuro pasa bien.**
**Modo claro tiene 3 fallos de contraste WCAG AA** que afectan elementos de uso constante:

| Par de color | Ratio actual | AA normal (4.5) | Dónde se usa | Veredicto |
|--------------|-------------:|:---------------:|--------------|-----------|
| Teal `#3ABFBF` + texto blanco | **2.24:1** | ❌ FALLA | Botones primarios, "Conectar", links "Ver todas →" | 🔴 Arreglar |
| Verde `#22c55e` sobre blanco | **2.28:1** | ❌ FALLA | Montos de ingreso "+ $1.350" en modo claro | 🔴 Arreglar |
| Rojo `#ef4444` + texto blanco | **3.76:1** | ⚠️ pasa solo large/UI | Botón "Cerrar sesión", badges | 🟡 OK en botones, no en texto chico |
| Texto principal / fondo (ambos modos) | 15–16:1 | ✅ | Cuerpo | OK |
| `muted-foreground` / card (ambos modos) | 4.8–6.9:1 | ✅ | Subtítulos | OK |

### Fix recomendado (mínimo, conserva la marca teal)

El teal `#3ABFBF` es la identidad — **no cambiarlo como color de fondo**. El problema es el **texto blanco
encima**. Dos opciones:

**Opción A (la más lazy, 1 token):** texto oscuro sobre los rellenos teal.
`--primary-foreground` blanco → un teal casi negro. Medido: texto `#06302F` sobre `#3ABFBF` da **~7.6:1** ✅.
Conserva el teal de marca, solo cambia el color de la etiqueta del botón.

**Opción B (si se prefiere texto blanco):** oscurecer el teal **solo en superficies con texto**.
Introducir `--primary-strong: #0E7C7C` (verificar que dé ≥4.5:1 con blanco) para botones/links, dejando
`#3ABFBF` para acentos decorativos (chips, bordes, gráficos) donde no hay texto encima.

**Verde de ingresos (modo claro):** usar un token `--success` más oscuro **solo en `:root`** (modo claro):
`#15803D` (green-700) sobre blanco da **~5:1** ✅. Dejar `#22c55e` en `.dark` (ahí ya da 7.6:1).
Es decir, separar el verde de texto del verde de fondo/badge.

> Después de tocar tokens, **re-medir** con la skill `chrome-devtools-mcp:a11y-debugging` o el script de
> contraste. No hardcodear hex en componentes (regla del proyecto): cambiar solo en `src/index.css`.

### Otros puntos de accesibilidad
- **Foco visible** en navegación por teclado (ya hay `outline-ring/50`; verificar que no se pise con `outline-none`).
- **No depender solo del color**: ingreso/gasto se distinguen por signo (+/−) además del verde/rojo. ✅ ya está.
- **Respetar `prefers-reduced-motion`** en las animaciones de los charts/drawers.

---

## 6. Priorización sugerida para v4

**Sprint 1 — frenar el abandono temprano (máximo ROI):**
seed de onboarding (backend) + primer-gasto guiado + fix de contraste en modo claro.
→ El día 1 deja de ser un vacío y la UI deja de tener texto ilegible.

**Sprint 2 — traer de vuelta:**
push de recordatorio diario + racha 🔥 visible + aviso de presupuesto.
→ Ataca la franja semana 2–4 donde se pierde a la gente.

**Sprint 3 — propósito y pulido:**
tarjeta "Tu mes" (insights) + saldo proyectado + atajos desktop + export CSV.
→ Le da al usuario un motivo para seguir cargando y a la app un aire más "pro".

---

## 7. Resumen: qué es front puro y qué necesita backend

| Mejora | Front solo | Necesita backend |
|--------|:----------:|:----------------:|
| Fix de contraste de color | ✅ (`src/index.css`) | — |
| Primer-gasto guiado / empty states con acción | ✅ | — |
| Mini-tour / checklist de arranque | ✅ (`localStorage`) | — |
| Búsqueda de movimientos (cliente) | ✅ | opcional (server-side al crecer) |
| Export CSV | ✅ | — |
| Saldo proyectado | ✅ (desde recurrentes) | — |
| Atajos de teclado desktop | ✅ | — |
| Optimistic updates | ✅ (TanStack Query) | — |
| Seed de onboarding | — | ✅ |
| Push notifications | parcial (Capacitor) | ✅ (token + cron) |
| Racha 🔥 | parcial (UI) | ✅ (`me/stats`) |
| Tarjeta "Tu mes" / insights | parcial | ✅ (`insights`) o derivar en cliente |
