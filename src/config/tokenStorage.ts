/**
 * Capa abstraída de persistencia del JWT.
 *
 * En web usa localStorage. El contrato advierte del riesgo XSS de localStorage,
 * pero la API devuelve el token en el body (no hay cookie httpOnly ni refresh),
 * así que es el almacenamiento pragmático para la SPA hoy.
 *
 * ponytail: implementación localStorage. En mobile (Capacitor) reemplazar el
 * cuerpo de estos 3 métodos por @capacitor/preferences o un SecureStorage,
 * sin tocar el resto de la app (auth store / axios consumen esta interfaz).
 */
const TOKEN_KEY = 'fv.token'

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* almacenamiento no disponible (modo privado, etc.) */
    }
  },
  remove(): void {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* noop */
    }
  },
}
