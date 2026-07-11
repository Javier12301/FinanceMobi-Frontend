import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/config/api'
import { useOwnerStore } from '@/store/useOwnerStore'
import { walletsKey } from './useWallets'

export interface WalletAdjustmentInput {
  id: string
  targetBalance: number
  note?: string
}

/** Registra un ajuste auditable; no modifica el saldo inicial de la billetera. */
export function useWalletAdjustment() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async ({ id, ...input }: WalletAdjustmentInput) => {
      const { data } = await api.post(`/wallets/${id}/adjustments`, { ...input, id: crypto.randomUUID() })
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: walletsKey(ownerId) })
      void queryClient.invalidateQueries({ queryKey: ['transactions', ownerId] })
    },
  })
}
