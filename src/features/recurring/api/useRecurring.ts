import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { api, isApiError, isNotAvailable } from '@/config/api'
import { useOnlineStore } from '@/store/useOnlineStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { enqueueMutation, offlineMutationId } from '@/features/offline'
import { walletsKey } from '@/features/wallets/api/useWallets'
import { uuid } from '@/utils/uuid'
import type {
  CreateRecurringRuleInput,
  RecurringRule,
  UpdateRecurringRuleInput,
} from '../types/recurring'

const rulesKey = (ownerId: string | null) => ['recurring-rules', ownerId] as const
const pendingKey = (ownerId: string | null) => ['recurring-pending', ownerId] as const

/**
 * GET /api/recurring-rules — reglas del owner.
 * ponytail: feature dormida; 404/501 -> [] (sin error rojo) hasta que el backend la publique.
 */
export function useRecurringRules() {
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useQuery({
    queryKey: rulesKey(ownerId),
    enabled: !!ownerId,
    retry: false,
    queryFn: async () => {
      try {
        const { data } = await api.get<RecurringRule[]>('/recurring-rules')
        return data
      } catch (e) {
        if (isNotAvailable(e)) return [] as RecurringRule[]
        throw e
      }
    },
  })
}

/** GET /api/recurring-rules/pending — vencidas sin confirmar (inbox del dashboard). */
export function usePendingRecurring() {
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useQuery({
    queryKey: pendingKey(ownerId),
    enabled: !!ownerId,
    retry: false,
    queryFn: async () => {
      try {
        const { data } = await api.get<RecurringRule[]>('/recurring-rules/pending')
        return data
      } catch (e) {
        if (isNotAvailable(e)) return [] as RecurringRule[]
        throw e
      }
    },
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return () => {
    queryClient.invalidateQueries({ queryKey: rulesKey(ownerId) })
    queryClient.invalidateQueries({ queryKey: pendingKey(ownerId) })
  }
}

export function useCreateRecurringRule() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (input: CreateRecurringRuleInput) => {
      if (env.isNative && useOnlineStore.getState().serverReachable === false) {
        await enqueueMutation({
          id: input.id!, ownerId, method: 'post', endpoint: '/recurring-rules', body: input,
        })
        return null as unknown as RecurringRule // optimista ya aplicado; el drain lo sube luego
      }
      try { return (await api.post<RecurringRule>('/recurring-rules', input)).data }
      catch (e) {
        if (env.isNative && isApiError(e) && e.status === 0) {
          await enqueueMutation({ id: input.id!, ownerId, method: 'post', endpoint: '/recurring-rules', body: input })
          return null as unknown as RecurringRule
        }
        throw e
      }
    },
    onMutate: async (input: CreateRecurringRuleInput) => {
      await queryClient.cancelQueries({ queryKey: rulesKey(ownerId) })
      // Mismo id para el optimista y el POST (idempotencia del replay offline).
      input.id ??= uuid()
      const now = new Date().toISOString()
      const startDate = input.startDate ?? now
      const optimistic: RecurringRule = {
        id: input.id,
        ownerId: ownerId!,
        walletId: input.walletId,
        categoryId: input.categoryId,
        movementType: input.movementType,
        amount: String(input.amount),
        frequency: input.frequency ?? 'MONTHLY',
        description: input.description ?? null,
        dayOfMonth: input.dayOfMonth,
        autoPost: input.autoPost,
        destinationWalletId: input.destinationWalletId ?? null,
        startDate,
        endDate: input.endDate ?? null,
        nextRunDate: startDate,
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      const snapshots = queryClient.getQueriesData<RecurringRule[]>({ queryKey: rulesKey(ownerId) })
      queryClient.setQueriesData<RecurringRule[]>({ queryKey: rulesKey(ownerId) }, (old) =>
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

export function useUpdateRecurringRule() {
  const invalidate = useInvalidate()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateRecurringRuleInput }) => {
      const enqueue = () => enqueueMutation({ id: offlineMutationId('recurring', 'put', id), ownerId, method: 'put', endpoint: `/recurring-rules/${id}`, body: input })
      if (env.isNative && useOnlineStore.getState().serverReachable === false) { await enqueue(); return null as unknown as RecurringRule }
      try { return (await api.put<RecurringRule>(`/recurring-rules/${id}`, input)).data }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return null as unknown as RecurringRule }; throw e }
    },
    onSuccess: invalidate,
  })
}

export function useDeleteRecurringRule() {
  const invalidate = useInvalidate()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async (id: string) => {
      const enqueue = () => enqueueMutation({ id: offlineMutationId('recurring', 'delete', id), ownerId, method: 'delete', endpoint: `/recurring-rules/${id}`, body: {} })
      if (env.isNative && useOnlineStore.getState().serverReachable === false) { await enqueue(); return }
      try { await api.delete(`/recurring-rules/${id}`) }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return }; throw e }
    },
    onSuccess: invalidate,
  })
}

/** POST /api/recurring-rules/:id/confirm — materializa la pendiente como Transaction. */
export function useConfirmRecurring() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidate()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async (id: string) => {
      const enqueue = () => enqueueMutation({ id: offlineMutationId('recurring', 'confirm', id), ownerId, method: 'post', endpoint: `/recurring-rules/${id}/confirm`, body: {} })
      if (env.isNative && useOnlineStore.getState().serverReachable === false) { await enqueue(); return }
      try { await api.post(`/recurring-rules/${id}/confirm`) }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return }; throw e }
    },
    onSuccess: () => {
      invalidate()
      // confirmar crea una transacción y cambia balances
      queryClient.invalidateQueries({ queryKey: ['transactions', ownerId] })
      queryClient.invalidateQueries({ queryKey: walletsKey(ownerId) })
    },
  })
}
