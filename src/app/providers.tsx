import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import { useApplyTheme } from '@/hooks/useTheme'
import { env } from '@/config/env'
import { sqlitePersister } from './sqlitePersister'
import { AppBoot } from './AppBoot'
import { queryClient } from './queryClient'
import { router } from './router'

// Persistimos SOLO las queries: en nativo usan SQLite (durable), en web localStorage
// (al reabrir sin red se ven los últimos datos cargados).
// Las mutaciones no se persisten; React Query las pausa offline y las reanuda
// sola al reconectar (outbox+replay dentro de la sesión).
// ponytail: para reanudar mutaciones tras cerrar la app por completo haría falta persistirlas
// con setMutationDefaults por mutationKey; se agrega si el caso "offline + app cerrada" lo pide.
const persister = env.isNative
  ? sqlitePersister
  : createSyncStoragePersister({
      storage: window.localStorage,
      key: 'fv.rq-cache',
    })

export function App() {
  useApplyTheme()
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: Infinity,
        dehydrateOptions: {
          shouldDehydrateMutation: () => false,
          // Por defecto React Query solo persiste queries en estado 'success'. Offline, tras una
          // mutación optimista + invalidación, la query queda 'pending'/pausada y NO se persistiría
          // (se perdía el listado al reabrir). Persistimos toda query que tenga datos.
          shouldDehydrateQuery: (query) => query.state.data !== undefined,
        },
      }}
    >
      <AppBoot>
        <RouterProvider router={router} />
      </AppBoot>
      <Toaster position="top-right" richColors />
    </PersistQueryClientProvider>
  )
}
