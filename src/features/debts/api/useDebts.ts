import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { api, isNotAvailable } from '@/config/api'
import { useOnlineStore } from '@/store/useOnlineStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { enqueueMutation } from '@/features/offline'
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
      if (env.isNative && useOnlineStore.getState().serverReachable === false) {
        await enqueueMutation({
          id: input.id!, ownerId, method: 'post', endpoint: '/debts', body: input,
        })
        return null as unknown as Debt // optimista ya aplicado; el drain lo sube luego
      }
      const { data } = await api.post<Debt>('/debts', input)
      return data
    },
    onMutate: async (input: CreateDebtInput) => {
      await queryClient.cancelQueries({ queryKey: debtsKey(ownerId) })
      // Mismo id para el optimista y el POST (idempotencia del replay offline).
      input.id ??= crypto.randomUUID()
      const now = new Date().toISOString()
      const optimistic: Debt = {
        id: input.id,
        ownerId: ownerId!,
        direction: input.direction,
        counterparty: input.counterparty,
        categoryId: input.categoryId ?? null,
        principal: String(input.principal),
        remaining: String(input.principal),
        interestPaid: '0',
        recurringRuleId: null,
        installmentsTotal: input.installmentsTotal ?? null,
        installmentsPaid: 0,
        dueDate: input.dueDate ?? null,
        status: 'ACTIVE',
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      }
      const snapshots = queryClient.getQueriesData<Debt[]>({ queryKey: debtsKey(ownerId) })
      queryClient.setQueriesData<Debt[]>({ queryKey: debtsKey(ownerId) }, (old) =>
        old ? [optimistic, ...old] : old,
      )
      return { snapshots }
    },
    onError: (_e, _input, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
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
    mutationFn: async ({ id, walletId, amount, date }: { id: string; walletId: string; amount: number; date?: string }) => {
      await api.post(`/debts/${id}/pay`, { walletId, amount, date })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: debtsKey(ownerId) })
      queryClient.invalidateQueries({ queryKey: ['transactions', ownerId] })
      queryClient.invalidateQueries({ queryKey: walletsKey(ownerId) })
    },
  })
}
