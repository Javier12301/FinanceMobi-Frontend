/**
 * True si la fecha elegida (yyyy-mm-dd) es anterior al día en que se creó la billetera.
 * Se usa para avisar sobre doble conteo: el saldo inicial ya refleja lo anterior a esa fecha.
 * ponytail: comparación de strings de día; ambas fechas se recortan a yyyy-mm-dd.
 */
export function isDateBeforeWalletStart(
  dateInput: string,
  wallet: { createdAt: string } | undefined,
): boolean {
  if (!wallet || !dateInput) return false
  return dateInput < wallet.createdAt.slice(0, 10)
}

/**
 * True si la fecha (ISO) cae en un día POSTERIOR a hoy: el backend la crearía como PENDING
 * (gasto futuro, no afecta el saldo). Espeja `startOfTomorrow()` del backend para que el
 * optimista offline muestre lo mismo que va a devolver el server.
 */
export function isFutureDate(iso: string): boolean {
  const startOfTomorrow = new Date()
  startOfTomorrow.setHours(0, 0, 0, 0)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
  return new Date(iso) >= startOfTomorrow
}
