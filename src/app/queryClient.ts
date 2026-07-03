import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/config/api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // gcTime alto: la caché se persiste en localStorage (ver providers.tsx) para poder
      // ver los datos offline al reabrir la app. Debe ser ≥ maxAge del persister.
      gcTime: 1000 * 60 * 60 * 24, // 24h
      retry: (failureCount, error) => {
        // No reintentar errores de cliente (401/403/404/409/429/501).
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})
