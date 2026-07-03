import { create } from 'zustand'
import { env } from '@/config/env'

interface OnlineState {
  serverReachable: boolean | null
  lastChecked: number | null
  set: (reachable: boolean) => void
}

export const useOnlineStore = create<OnlineState>((set) => ({
  serverReachable: null,
  lastChecked: null,
  set: (reachable) => set({ serverReachable: reachable, lastChecked: Date.now() }),
}))

/**
 * Ping al backend con timeout corto. Cualquier respuesta HTTP = servidor vivo
 * (incluso 401/404); solo el error de red o el timeout cuentan como "caído".
 * ponytail: fetch directo (no axios) para no disparar el interceptor de 401.
 */
export async function checkServer(timeoutMs = 2500): Promise<boolean> {
  const base = env.apiBaseUrl
  if (!base) {
    useOnlineStore.getState().set(false) // APK sin URL configurada aún
    return false
  }
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    await fetch(`${base}/health`, { signal: ctrl.signal, cache: 'no-store' })
    useOnlineStore.getState().set(true)
    return true
  } catch {
    useOnlineStore.getState().set(false)
    return false
  } finally {
    clearTimeout(t)
  }
}

export const useServerReachable = () => useOnlineStore((s) => s.serverReachable === true)
