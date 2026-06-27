import { useQuery } from '@tanstack/react-query'
import { api } from '@/config/api'
import { useOwnerStore } from '@/store/useOwnerStore'
import type { Transaction, TransactionFilters } from '../types/transaction'

export const transactionsKey = (ownerId: string | null, filters: TransactionFilters) =>
  ['transactions', ownerId, filters] as const

/** GET /api/transactions — con filtros opcionales (walletId, categoryId, dateFrom, dateTo). */
export function useTransactions(filters: TransactionFilters = {}) {
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useQuery({
    queryKey: transactionsKey(ownerId, filters),
    enabled: !!ownerId,
    queryFn: async () => {
      const { data } = await api.get<Transaction[]>('/transactions', { params: filters })
      return data
    },
  })
}
