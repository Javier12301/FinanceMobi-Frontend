import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { api, isApiError, isNotAvailable } from '@/config/api'
import { useOnlineStore } from '@/store/useOnlineStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { enqueueMutation, offlineMutationId } from '@/features/offline'
import { walletsKey } from '@/features/wallets/api/useWallets'
import type { Debt, CreateDebtInput, UpdateDebtInput } from '../types/debt'
import { uuid } from '@/utils/uuid'

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
      const enqueue = () =>
        enqueueMutation({ id: input.id!, ownerId, method: 'post', endpoint: '/debts', body: input })
      // Lectura síncrona del flag (sin await en el path caliente); si quedó stale, el catch de
      // status 0 cae al outbox. El listener nativo de AppBoot lo pone en false al desconectarse.
      const offline = env.isNative && useOnlineStore.getState().serverReachable === false
      if (offline) {
        await enqueue()
        return null as unknown as Debt // optimista ya aplicado; el drain lo sube luego
      }
      try {
        const { data } = await api.post<Debt>('/debts', input)
        return data
      } catch (e) {
        // Red caída que el flag no detectó: caer al outbox en vez de perder la deuda.
        if (env.isNative && isApiError(e) && e.status === 0) {
          await enqueue()
          return null as unknown as Debt
        }
        throw e
      }
    },
    onMutate: async (input: CreateDebtInput) => {
      // Sin await: cancelar un refetch pausado offline no resuelve y colgaría el onMutate.
      void queryClient.cancelQueries({ queryKey: debtsKey(ownerId) })
      // Mismo id para el optimista y el POST (idempotencia del replay offline).
      input.id ??= uuid()
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
    // Offline no invalidamos (refetch pausado inútil que traba la próxima alta).
    onSuccess: () => {
      if (useOnlineStore.getState().serverReachable !== false) {
        queryClient.invalidateQueries({ queryKey: debtsKey(ownerId) })
      }
    },
  })
}

export function useUpdateDebt() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateDebtInput }) => {
      const enqueue = () => enqueueMutation({ id: offlineMutationId('debt', 'put', id), ownerId, method: 'put', endpoint: `/debts/${id}`, body: input })
      const offline = env.isNative && useOnlineStore.getState().serverReachable === false
      if (offline) { await enqueue(); return null as unknown as Debt }
      try { return (await api.put<Debt>(`/debts/${id}`, input)).data }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return null as unknown as Debt }; throw e }
    },
    onMutate: ({ id, input }) => {
      const snapshot = queryClient.getQueryData<Debt[]>(debtsKey(ownerId))
      queryClient.setQueryData<Debt[]>(debtsKey(ownerId), (old) => old?.map((debt) => debt.id === id ? { ...debt, ...input, updatedAt: new Date().toISOString() } : debt))
      return { snapshot }
    },
    onError: (_e, _vars, ctx) => queryClient.setQueryData(debtsKey(ownerId), ctx?.snapshot),
    onSuccess: () => { if (useOnlineStore.getState().serverReachable !== false) queryClient.invalidateQueries({ queryKey: debtsKey(ownerId) }) },
  })
}

export function useDeleteDebt() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async (id: string) => {
      const enqueue = () => enqueueMutation({ id: offlineMutationId('debt', 'delete', id), ownerId, method: 'delete', endpoint: `/debts/${id}`, body: {} })
      const offline = env.isNative && useOnlineStore.getState().serverReachable === false
      if (offline) { await enqueue(); return }
      try { await api.delete(`/debts/${id}`) }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return }; throw e }
    },
    onMutate: (id) => { const snapshot = queryClient.getQueryData<Debt[]>(debtsKey(ownerId)); queryClient.setQueryData<Debt[]>(debtsKey(ownerId), (old) => old?.filter((debt) => debt.id !== id)); return { snapshot } },
    onError: (_e, _id, ctx) => queryClient.setQueryData(debtsKey(ownerId), ctx?.snapshot),
    onSuccess: () => { if (useOnlineStore.getState().serverReachable !== false) queryClient.invalidateQueries({ queryKey: debtsKey(ownerId) }) },
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
      const body = { id: uuid(), walletId, amount, date }
      const enqueue = () => enqueueMutation({ id: offlineMutationId('debt', 'pay', body.id), ownerId, method: 'post', endpoint: `/debts/${id}/pay`, body })
      const offline = env.isNative && useOnlineStore.getState().serverReachable === false
      if (offline) { await enqueue(); return }
      try { await api.post(`/debts/${id}/pay`, body) }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return }; throw e }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: debtsKey(ownerId) })
      queryClient.invalidateQueries({ queryKey: ['transactions', ownerId] })
      queryClient.invalidateQueries({ queryKey: walletsKey(ownerId) })
    },
  })
}
