import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'
import { ensureDb } from '@/config/db'

const KEY = 'rq-cache'

// ponytail: throttle mínimo a mano, no una dep — replica el default de los persisters oficiales
// (createSyncStoragePersister/createAsyncStoragePersister), que el Persister custom no trae.
// Sin esto se persistía en CADA cambio de caché (~14KB) → tormenta de writes que saturaba la
// conexión SQLite compartida con el outbox. Coalesce: solo se escribe el último client cada ~1s.
const THROTTLE_MS = 1000
let pending: PersistedClient | null = null
let timer: ReturnType<typeof setTimeout> | null = null

async function flush() {
  timer = null
  const client = pending
  pending = null
  if (!client) return
  try {
    const db = await ensureDb()
    await db.run('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [KEY, JSON.stringify(client)])
  } catch (e) {
    console.error('[rq-persist] ERROR al guardar en SQLite:', e)
  }
}

export const sqlitePersister: Persister = {
  persistClient: async (client) => {
    pending = client
    if (timer === null) timer = setTimeout(() => void flush(), THROTTLE_MS)
  },
  restoreClient: async () => {
    try {
      const db = await ensureDb()
      const res = await db.query('SELECT value FROM kv WHERE key = ?', [KEY])
      const value = res.values?.[0]?.value as string | undefined
      return value ? (JSON.parse(value) as PersistedClient) : undefined
    } catch (e) {
      console.error('[rq-persist] ERROR al restaurar de SQLite:', e)
      return undefined
    }
  },
  removeClient: async () => {
    // Cancelar un flush en vuelo: si no, re-escribiría la caché justo después de borrarla.
    if (timer !== null) { clearTimeout(timer); timer = null }
    pending = null
    const db = await ensureDb()
    await db.run('DELETE FROM kv WHERE key = ?', [KEY])
  },
}
