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

/** POST /api/transactions
 *  Con update optimista: el movimiento se ve al instante y, sin red, la mutación queda
 *  pausada (networkMode online de React Query) y se reenvía sola al reconectar.
 *  ponytail: el id del optimista es solo local; no se manda al backend hasta que POST sea
 *  idempotente por id de cliente (T2C) — hoy el refetch al reconectar reemplaza el temporal. */
export function useCreateTransaction() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  const invalidate = useInvalidateAfterTxn()
  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const { data } = await api.post<Transaction>('/transactions', input)
      return data
    },
    onMutate: async (input: CreateTransactionInput) => {
      await queryClient.cancelQueries({ queryKey: ['transactions', ownerId] })
      const now = new Date().toISOString()
      const optimistic: Transaction = {
        id: crypto.randomUUID(),
        walletId: input.walletId,
        destinationWalletId: input.destinationWalletId ?? null,
        categoryId: input.categoryId,
        amount: String(input.amount),
        description: input.description ?? null,
        date: input.date,
        movementType: input.movementType,
        createdAt: now,
        updatedAt: now,
      }
      const snapshots = queryClient.getQueriesData<Transaction[]>({ queryKey: ['transactions', ownerId] })
      queryClient.setQueriesData<Transaction[]>({ queryKey: ['transactions', ownerId] }, (old) =>
        old ? [optimistic, ...old] : old,
      )
      return { snapshots }
    },
    onError: (_e, _input, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
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
