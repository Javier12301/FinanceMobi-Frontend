/** Helpers de fecha sobre ISO 8601 (formato que usa el backend). */

const DATE_FMT = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})
const TIME_FMT = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
})

/** "12 may 2024" */
export function formatDate(iso: string): string {
  return DATE_FMT.format(new Date(iso))
}

/** "11:23" */
export function formatTime(iso: string): string {
  return TIME_FMT.format(new Date(iso))
}

/** Clave de agrupación legible: "Hoy" / "Ayer" / "12 may 2024". */
export function dateGroupLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (sameDay(d, today)) return 'Hoy'
  if (sameDay(d, yesterday)) return 'Ayer'
  return formatDate(iso)
}

/** Date -> "YYYY-MM-DD" en hora LOCAL (no UTC: evita el corrimiento de día). */
export function dateToInput(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Convierte un <input type="date"> (YYYY-MM-DD) a ISO 8601 con hora actual.
 *  ponytail: parsea como fecha LOCAL (new Date("YYYY-MM-DD") sería UTC y corre el día en TZ negativas). */
export function dateInputToIso(dateStr: string): string {
  if (!dateStr) return new Date().toISOString()
  const [y, m, d] = dateStr.split('-').map(Number)
  const now = new Date()
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), 0).toISOString()
}

/** ISO -> "YYYY-MM-DD" para <input type="date"> (en hora local). */
export function isoToDateInput(iso: string): string {
  return dateToInput(new Date(iso))
}
