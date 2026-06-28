import { useQuery } from '@tanstack/react-query'
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
