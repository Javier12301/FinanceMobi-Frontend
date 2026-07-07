import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import { useApplyTheme } from '@/hooks/useTheme'
import { AppBoot } from './AppBoot'
import { queryClient } from './queryClient'
import { router } from './router'

// Persistimos SOLO las queries en localStorage: al reabrir la app sin red se ven los últimos
// datos cargados. Las mutaciones no se persisten; React Query las pausa offline y las reanuda
// sola al reconectar (outbox+replay dentro de la sesión).
// ponytail: para reanudar mutaciones tras cerrar la app por completo haría falta persistirlas
// con setMutationDefaults por mutationKey; se agrega si el caso "offline + app cerrada" lo pide.
const persister = createSyncStoragePersister({
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
        maxAge: 1000 * 60 * 60 * 24, // 24h, igual al gcTime
        dehydrateOptions: { shouldDehydrateMutation: () => false },
      }}
    >
      <AppBoot>
        <RouterProvider router={router} />
      </AppBoot>
      <Toaster position="top-right" richColors />
    </PersistQueryClientProvider>
  )
}
