/**
 * UUID v4 con fallback.
 *
 * `crypto.randomUUID` SOLO existe en contexto seguro (https o localhost). Servir la app por IP
 * de LAN con http (`npm run dev:lan` abierto desde otro dispositivo, o desde el browser en
 * http://192.168.x.x:5173) NO es contexto seguro: ahí `crypto.randomUUID` es `undefined` y
 * llamarla tira TypeError, que rompía TODAS las mutaciones (el id de cliente se genera en el
 * onMutate, así que la request ni salía y la UI mostraba "Ocurrió un error inesperado").
 *
 * `crypto.getRandomValues` sí está disponible en contexto no seguro, así que se arma el v4 a mano.
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante RFC 4122

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
