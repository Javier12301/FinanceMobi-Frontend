import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/config/api'
import { useOwnerStore } from '@/store/useOwnerStore'
import { walletsKey } from '@/features/wallets/api/useWallets'
import type { CreateTransactionInput, Transaction, UpdateTransactionInput } from '../types/transaction'

/** Invalida transacciones + wallets (cambia el balance) del owner activo. */
function useInvalidateAfterTxn() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return () => {
    queryClient.invalidateQueries({ queryKey: ['transactions', ownerId] })
    queryClient.invalidateQueries({ queryKey: walletsKey(ownerId) })
  }
}

/** POST /api/transactions */
export function useCreateTransaction() {
  const invalidate = useInvalidateAfterTxn()
  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const { data } = await api.post<Transaction>('/transactions', input)
      return data
    },
    onSuccess: invalidate,
  })
}

/** PUT /api/transactions/:id (el contrato usa PUT; no permite cambiar tipo/billeteras) */
export function useUpdateTransaction() {
  const invalidate = useInvalidateAfterTxn()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTransactionInput }) => {
      const { data } = await api.put<Transaction>(`/transactions/${id}`, input)
      return data
    },
    onSuccess: invalidate,
  })
}

/**
 * DELETE /api/transactions/:id — soft delete real (v2).
 * Revierte balance y limpia adjuntos en el backend. 409 si tiene adjuntos y Drive no conectado.
 */
export function useDeleteTransaction() {
  const invalidate = useInvalidateAfterTxn()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/transactions/${id}`)
    },
    onSuccess: invalidate,
  })
}
