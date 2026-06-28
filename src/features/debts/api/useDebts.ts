import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, isNotAvailable } from '@/config/api'
import { useOwnerStore } from '@/store/useOwnerStore'
import { walletsKey } from '@/features/wallets/api/useWallets'
import type { Debt, CreateDebtInput, UpdateDebtInput } from '../types/debt'

const debtsKey = (ownerId: string | null) => ['debts', ownerId] as const

/**
 * GET /api/debts — deudas y préstamos del owner.
 * ponytail: feature dormida; si el backend aún no la expone (404/501), devuelve [] sin error rojo.
 */
export function useDebts() {
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useQuery({
    queryKey: debtsKey(ownerId),
    enabled: !!ownerId,
    retry: false,
    queryFn: async () => {
      try {
        const { data } = await api.get<Debt[]>('/debts')
        return data
      } catch (e) {
        if (isNotAvailable(e)) return [] as Debt[]
        throw e
      }
    },
  })
}

export function useCreateDebt() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async (input: CreateDebtInput) => {
      const { data } = await api.post<Debt>('/debts', input)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: debtsKey(ownerId) }),
  })
}

export function useUpdateDebt() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateDebtInput }) => {
      const { data } = await api.put<Debt>(`/debts/${id}`, input)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: debtsKey(ownerId) }),
  })
}

export function useDeleteDebt() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/debts/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: debtsKey(ownerId) }),
  })
}

/**
 * POST /api/debts/:id/pay — registra un pago/cobro: crea la Transaction desde `walletId` y baja
 * `remaining`. Cambia balances → invalida transactions y wallets además de debts.
 * Conexión cableada para V4 (la UI de pago llega después; el contrato queda definido).
 */
export function usePayDebt() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async ({ id, walletId, amount }: { id: string; walletId: string; amount: number }) => {
      await api.post(`/debts/${id}/pay`, { walletId, amount })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: debtsKey(ownerId) })
      queryClient.invalidateQueries({ queryKey: ['transactions', ownerId] })
      queryClient.invalidateQueries({ queryKey: walletsKey(ownerId) })
    },
  })
}
