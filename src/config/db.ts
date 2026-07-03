import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite'
import { env } from './env'

const DB_NAME = 'financemobile'
let conn: SQLiteDBConnection | null = null

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
`

/** Abre la DB y crea el esquema. No-op en web (se sigue usando localStorage). */
export async function initDb(): Promise<void> {
  if (!env.isNative) return
  try {
    const sqlite = new SQLiteConnection(CapacitorSQLite)
    conn = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)
    await conn.open()
    await conn.execute(SCHEMA)
  } catch (e) {
    console.error('SQLite init error (no-blocking):', e)
    // No bloquear el arranque si la DB falla
  }
}

export function getDb(): SQLiteDBConnection {
  if (!conn) throw new Error('SQLite no inicializada (initDb no corrió)')
  return conn
}
