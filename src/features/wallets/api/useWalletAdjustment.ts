import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, isApiError } from '@/config/api'
import { env } from '@/config/env'
import { useOnlineStore } from '@/store/useOnlineStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { enqueueMutation, offlineMutationId } from '@/features/offline'
import { walletsKey } from './useWallets'
import type { Wallet } from '../types/wallet'

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
      const body = { ...input, id: crypto.randomUUID() }
      const enqueue = () => enqueueMutation({ id: offlineMutationId('wallet', 'adjustment', body.id), ownerId, method: 'post', endpoint: `/wallets/${id}/adjustments`, body })
      if (env.isNative && useOnlineStore.getState().serverReachable === false) { await enqueue(); return null }
      try { return (await api.post(`/wallets/${id}/adjustments`, body)).data }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return null }; throw e }
    },
    onMutate: ({ id, targetBalance }) => {
      const snapshot = queryClient.getQueryData<Wallet[]>(walletsKey(ownerId))
      queryClient.setQueryData<Wallet[]>(walletsKey(ownerId), (old) => old?.map((wallet) => wallet.id === id ? { ...wallet, currentBalance: String(targetBalance), updatedAt: new Date().toISOString() } : wallet))
      return { snapshot }
    },
    onError: (_e, _input, ctx) => queryClient.setQueryData(walletsKey(ownerId), ctx?.snapshot),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: walletsKey(ownerId) })
      void queryClient.invalidateQueries({ queryKey: ['transactions', ownerId] })
    },
  })
}
