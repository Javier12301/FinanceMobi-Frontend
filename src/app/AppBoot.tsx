import { useEffect, useState, type ReactNode } from 'react'
import { Network } from '@capacitor/network'
import { initDb } from '@/config/db'
import { env } from '@/config/env'
import { checkServer } from '@/store/useOnlineStore'
import { useAuthStore } from '@/store/useAuthStore'
import { drainOutbox } from '@/features/offline'
import { queryClient } from './queryClient'

/** Splash mínimo mientras corre el primer health-check. */
function Splash() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background text-foreground">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Sincronizando…</p>
    </div>
  )
}

export function AppBoot({ children }: { children: ReactNode }) {
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      await initDb() // no-op en web
      const reachable = await checkServer()
      if (reachable && useAuthStore.getState().isAuthenticated) {
        // Sube el outbox de la sesión y reconcilia con el server (fuente de verdad).
        if (env.isNative) {
          await drainOutbox()
        } else {
          await queryClient.resumePausedMutations()
        }
        await queryClient.invalidateQueries()
      }
      if (!cancelled) setBooted(true)
    }
    void boot()

    // Re-chequear cuando cambia el estado de red (reconexión).
    const handle = Network.addListener('networkStatusChange', async () => {
      const reachable = await checkServer()
      if (reachable) {
        void drainOutbox()
      }
    })
    return () => { cancelled = true; void handle.then((h: any) => h.remove()) }
  }, [])

  if (!booted) return <Splash />
  return <>{children}</>
}
