import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/config/api'
import { useOwnerStore } from '@/store/useOwnerStore'
import type { CreateWalletInput, UpdateWalletInput, Wallet } from '../types/wallet'
import { walletsKey } from './useWallets'

function useInvalidateWallets() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return () => queryClient.invalidateQueries({ queryKey: walletsKey(ownerId) })
}

/** POST /api/wallets */
export function useCreateWallet() {
  const invalidate = useInvalidateWallets()
  return useMutation({
    mutationFn: async (input: CreateWalletInput) => {
      const { data } = await api.post<Wallet>('/wallets', input)
      return data
    },
    onSuccess: invalidate,
  })
}

/** PUT /api/wallets/:walletId (el contrato usa PUT, no PATCH) */
export function useUpdateWallet() {
  const invalidate = useInvalidateWallets()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateWalletInput }) => {
      const { data } = await api.put<Wallet>(`/wallets/${id}`, input)
      return data
    },
    onSuccess: invalidate,
  })
}

/** DELETE /api/wallets/:walletId (409 si tiene transacciones) */
export function useDeleteWallet() {
  const invalidate = useInvalidateWallets()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/wallets/${id}`)
    },
    onSuccess: invalidate,
  })
}
