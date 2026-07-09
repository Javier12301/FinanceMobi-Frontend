import { useQuery } from '@tanstack/react-query'
import { api } from '@/config/api'
import { useOwnerStore } from '@/store/useOwnerStore'
import type { Wallet } from '../types/wallet'

export const walletsKey = (ownerId: string | null) => ['wallets', ownerId] as const

/** GET /api/wallets — billeteras del owner activo. */
export function useWallets() {
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useQuery({
    queryKey: walletsKey(ownerId),
    enabled: !!ownerId,
    // Lookup estable para el form de movimiento: sin refetch en background al abrir.
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await api.get<Wallet[]>('/wallets')
      return data
    },
  })
}
