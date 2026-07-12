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
