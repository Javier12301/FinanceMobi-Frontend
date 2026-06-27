import type { MovementType } from '@/features/categories'

/**
 * Recuerda la última billetera/categoría usada por tipo de movimiento, para precargar el form.
 * ponytail: localStorage simple, sin store ni backend.
 */
const KEY = 'fv.lastUsed'

type LastUsed = Partial<Record<MovementType, { walletId?: string; categoryId?: string }>>

function read(): LastUsed {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function getLastUsed(type: MovementType) {
  return read()[type] ?? {}
}

export function setLastUsed(type: MovementType, value: { walletId?: string; categoryId?: string }) {
  const all = read()
  all[type] = { ...all[type], ...value }
  localStorage.setItem(KEY, JSON.stringify(all))
}
