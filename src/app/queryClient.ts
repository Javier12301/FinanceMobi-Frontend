import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/config/api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // gcTime infinito: no recolectamos queries para que la caché hidratada (SQLite en nativo,
      // localStorage en web) sobreviva offline.
      gcTime: Infinity,
      retry: (failureCount, error) => {
        // No reintentar errores de cliente (401/403/404/409/429/501).
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
      // 'always' = mutationFn SIEMPRE corre, aunque onlineManager crea que está offline (el
      // evento 'online' del WebView Android no es confiable). Con el default 'online' la mutación
      // quedaba isPaused y su mutationFn nunca se ejecutaba → botón "Guardando…" pegado y el
      // movimiento no se encolaba en el outbox. El outbox SQLite es la vía durable de escritura
      // offline; la mutationFn decide online/offline y encola ella misma.
      networkMode: 'always',
    },
  },
})
