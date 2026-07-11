import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite'
import { env } from './env'

const DB_NAME = 'financemobile'
let conn: SQLiteDBConnection | null = null
let initPromise: Promise<SQLiteDBConnection> | null = null
const sqlite = new SQLiteConnection(CapacitorSQLite)

const SCHEMA = `
CREATE TABLE IF NOT EXISTS pending_mutations (
  id TEXT PRIMARY KEY,
  owner_id TEXT,
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  body_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`

/** Abre la DB y crea el esquema. Idempotente con promesa memoizada. */
export function ensureDb(): Promise<SQLiteDBConnection> {
  if (initPromise !== null) return initPromise

  initPromise = (async () => {
    // Android puede conservar una conexión nativa tras recrear el WebView. La consistencia
    // compara el registro JS con el nativo y cierra conexiones huérfanas antes de crear otra.
    await sqlite.checkConnectionsConsistency()
    try {
      conn = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes('already exists')) throw error

      // Recuperación para APKs donde el plugin dejó la conexión nativa abierta pero el bridge JS
      // se reinició. No elimina el archivo SQLite ni sus datos: solo libera el handle nativo.
      await CapacitorSQLite.closeConnection({ database: DB_NAME, readonly: false })
      conn = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)
    }
    await conn.open()
    await conn.execute(SCHEMA)
    return conn
  })()

  // Un fallo transitorio no debe bloquear para siempre los siguientes intentos de persister/outbox.
  initPromise.catch(() => { initPromise = null; conn = null })

  return initPromise
}

/** Abre la DB y crea el esquema. No-op en web (se sigue usando localStorage). */
export async function initDb(): Promise<void> {
  if (!env.isNative) return
  try {
    await ensureDb()
  } catch (e) {
    console.error('SQLite init error (no-blocking):', e)
    // No bloquear el arranque si la DB falla
  }
}

export function getDb(): SQLiteDBConnection {
  if (!conn) throw new Error('SQLite no inicializada (initDb no corrió)')
  return conn
}

/** Indica si el dispositivo ya tiene una caché React Query durable para abrir sin servidor. */
export async function hasOfflineCache(): Promise<boolean> {
  if (!env.isNative) return true
  try {
    const db = await ensureDb()
    const result = await db.query('SELECT 1 FROM kv WHERE key = ? LIMIT 1', ['rq-cache'])
    return (result.values?.length ?? 0) > 0
  } catch {
    return false
  }
}
