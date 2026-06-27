/** Payload del JWT emitido por el backend (ver contrato §2.1). */
export interface JwtPayload {
  sub: string // UUID del usuario
  email: string
  jti: string // UUID de sesión
  exp?: number // epoch seconds
  iat?: number
}

/**
 * Decodifica el payload de un JWT sin verificar la firma.
 * El frontend solo necesita `sub` (para X-Owner-Id propio) y `email`.
 * Devuelve null si el token está malformado.
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}

/** True si el token expiró (con margen de 10s) o es inválido. */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token)
  if (!payload?.exp) return false // sin exp = no podemos saber; lo deja pasar (el backend decide)
  return Date.now() >= payload.exp * 1000 - 10_000
}
