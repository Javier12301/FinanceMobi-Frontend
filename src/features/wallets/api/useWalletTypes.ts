import { useQuery } from '@tanstack/react-query'
import { api } from '@/config/api'
import type { WalletType } from '../types/wallet'

/** GET /api/wallet-types — lookup público de tipos de billetera. */
export function useWalletTypes() {
  return useQuery({
    queryKey: ['wallet-types'],
    staleTime: Infinity, // catálogo estático
    queryFn: async () => {
      const { data } = await api.get<WalletType[]>('/wallet-types')
      return data
    },
  })
}
