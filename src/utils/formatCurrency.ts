/**
 * El backend serializa los Decimal de MySQL como string ("1500.00").
 * Estas helpers operan sobre string | number sin romper la precisión visual.
 */

/** Convierte el decimal-string del backend a number (para sumas/comparaciones de UI). */
export function parseDecimal(value: string | number | null | undefined): number {
  if (value == null) return 0
  const n = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Formatea un monto al estilo del prototipo: "$ 1.500" (es-AR, sin decimales).
 * Acepta el string decimal del backend o un number.
 */
export function formatCurrency(value: string | number | null | undefined): string {
  const n = parseDecimal(value)
  return '$ ' + n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

/** Signo + color según el tipo de movimiento (coincide con el prototipo). */
export function amountPrefix(movementType: string): string {
  if (movementType === 'EXPENSE') return '−'
  if (movementType === 'INCOME') return '+'
  return ''
}
