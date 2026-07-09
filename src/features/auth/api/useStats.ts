import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, isNotAvailable } from '@/config/api'

export interface Stats {
  currentStreak: number
  longestStreak: number
  daysActiveThisMonth: number
  totalMovements: number
  firstMovementAt: string | null
}

const EMPTY: Stats = {
  currentStreak: 0,
  longestStreak: 0,
  daysActiveThisMonth: 0,
  totalMovements: 0,
  firstMovementAt: null,
}

// GET /api/me/stats — solo JWT, sin X-Owner-Id
export function useStats() {
  return useQuery({
    queryKey: ['me-stats'],
    retry: false,
    queryFn: async () => {
      try {
        const { data } = await api.get<Stats>('/me/stats')
        return data
      } catch (e) {
        if (isNotAvailable(e)) return EMPTY
        throw e
      }
    },
  })
}

/**
 * POST /api/me/check-in — marca la entrada del día (idempotente) y refresca la racha.
 * Se dispara al entrar a la app; la racha pertenece al usuario autenticado, no al owner activo.
 */
export function useCheckIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Stats>('/me/check-in')
      return data
    },
    onSuccess: (data) => queryClient.setQueryData(['me-stats'], data),
    // Silencioso: si el endpoint está dormido (404/501), no molestamos al usuario.
    onError: () => {},
  })
}
