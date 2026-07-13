import { getDb } from '@/config/db'
import { env } from '@/config/env'
import { api, isApiError } from '@/config/api'
import { queryClient } from '@/app/queryClient'
import { useOwnerStore } from '@/store/useOwnerStore'
import { uuid } from '@/utils/uuid'

interface OutboxRow {
  id: string
  owner_id: string | null
  method: string
  endpoint: string
  body_json: string
}

/** Evita colisiones entre operaciones distintas sobre el mismo recurso. */
export function offlineMutationId(resource: string, operation: string, id: string = uuid()): string {
  return `${resource}:${operation}:${id}`
}

export async function enqueueMutation(m: {
  id: string
  ownerId: string | null
  method: string
  endpoint: string
  body: unknown
}): Promise<void> {
  if (!env.isNative) return
  await getDb().run(
    `INSERT OR IGNORE INTO pending_mutations (id, owner_id, method, endpoint, body_json, created_at)
     VALUES (?,?,?,?,?,?)`,
    [m.id, m.ownerId, m.method, m.endpoint, JSON.stringify(m.body), Date.now()],
  )
}

/** Reenvía el outbox en orden FIFO. Idempotente en el server (mismo id → no duplica). */
export async function drainOutbox(): Promise<void> {
  if (!env.isNative) return
  const ownerId = useOwnerStore.getState().activeOwnerId
  if (!ownerId) return
  const res = await getDb().query(
    `SELECT id, owner_id, method, endpoint, body_json FROM pending_mutations
     WHERE owner_id = ? ORDER BY created_at ASC`, [ownerId],
  )
  const rows = (res.values ?? []) as OutboxRow[]
  for (const row of rows) {
    try {
      await api.request({ method: row.method, url: row.endpoint, data: JSON.parse(row.body_json) })
      await getDb().run(`DELETE FROM pending_mutations WHERE id = ?`, [row.id])
    } catch (e) {
      // DELETE es idempotente: un 404 indica que otra sesión ya alcanzó el estado deseado.
      if (row.method.toLowerCase() === 'delete' && isApiError(e) && e.status === 404) {
        await getDb().run(`DELETE FROM pending_mutations WHERE id = ?`, [row.id])
        continue
      }
      if (isApiError(e) && e.status >= 400 && e.status < 500) {
        // 4xx: no reintentable (validación/duplicado ya aplicado). Marcar y seguir con la cola.
        await getDb().run(`UPDATE pending_mutations SET tries = tries + 1, last_error = ? WHERE id = ?`, [e.message, row.id])
        continue
      }
      // Error de red: el server se cayó de nuevo. Cortar; se reintenta en el próximo drain.
      break
    }
  }
  await queryClient.invalidateQueries()
}

/** Descarta operaciones locales de una cuenta que acaba de reiniciar sus datos contables. */
export async function clearOutboxForOwner(ownerId: string): Promise<void> {
  if (!env.isNative) return
  await getDb().run('DELETE FROM pending_mutations WHERE owner_id = ?', [ownerId])
}
