import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, isApiError, isNotAvailable } from '@/config/api'
import { env } from '@/config/env'
import { useOnlineStore } from '@/store/useOnlineStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { enqueueMutation, offlineMutationId } from '@/features/offline'
import { uuid } from '@/utils/uuid'
import { parseDecimal } from '@/utils/formatCurrency'
import type {
  SavingsGoal,
  CreateGoalInput,
  UpdateGoalInput,
  CreateContributionInput,
} from '../types/savings'

export const savingsKey = (ownerId: string | null) => ['savings-goals', ownerId] as const

export function useSavingsGoals() {
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useQuery({
    queryKey: savingsKey(ownerId),
    enabled: !!ownerId,
    retry: false,
    queryFn: async () => {
      try {
        return (await api.get<SavingsGoal[]>('/savings-goals')).data
      } catch (e) {
        // Degradar con gracia si el backend todavía no publica el endpoint.
        if (isNotAvailable(e)) return []
        throw e
      }
    },
  })
}

function useSavingsContext() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  const offline = () => env.isNative && useOnlineStore.getState().serverReachable === false
  return {
    queryClient,
    ownerId,
    offline,
    invalidate: () => queryClient.invalidateQueries({ queryKey: savingsKey(ownerId) }),
    snapshot: () => queryClient.getQueryData<SavingsGoal[]>(savingsKey(ownerId)),
    write: (fn: (old: SavingsGoal[] | undefined) => SavingsGoal[] | undefined) =>
      queryClient.setQueryData<SavingsGoal[]>(savingsKey(ownerId), fn),
    restore: (snap: SavingsGoal[] | undefined) => queryClient.setQueryData(savingsKey(ownerId), snap),
  }
}

export function useCreateGoal() {
  const { ownerId, offline, invalidate, snapshot, write, restore } = useSavingsContext()
  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const enqueue = () =>
        enqueueMutation({ id: input.id!, ownerId, method: 'post', endpoint: '/savings-goals', body: input })
      if (offline()) { await enqueue(); return null as unknown as SavingsGoal }
      try { return (await api.post<SavingsGoal>('/savings-goals', input)).data }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return null as unknown as SavingsGoal }; throw e }
    },
    onMutate: (input) => {
      input.id ??= uuid()
      const snap = snapshot()
      const now = new Date().toISOString()
      const optimistic: SavingsGoal = {
        id: input.id,
        ownerId: ownerId!,
        name: input.name,
        targetAmount: String(input.targetAmount),
        targetDate: input.targetDate ?? null,
        saved: '0.00',
        contributions: [],
        createdAt: now,
        updatedAt: now,
      }
      write((old) => (old ? [optimistic, ...old] : [optimistic]))
      return { snap }
    },
    onError: (_e, _input, ctx) => restore(ctx?.snap),
    onSuccess: () => { if (!offline()) invalidate() },
  })
}

export function useUpdateGoal() {
  const { ownerId, offline, invalidate, snapshot, write, restore } = useSavingsContext()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateGoalInput }) => {
      const enqueue = () =>
        enqueueMutation({ id: offlineMutationId('savings-goal', 'put', id), ownerId, method: 'put', endpoint: `/savings-goals/${id}`, body: input })
      if (offline()) { await enqueue(); return null as unknown as SavingsGoal }
      try { return (await api.put<SavingsGoal>(`/savings-goals/${id}`, input)).data }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return null as unknown as SavingsGoal }; throw e }
    },
    onMutate: ({ id, input }) => {
      const snap = snapshot()
      write((old) =>
        old?.map((g) =>
          g.id === id
            ? {
                ...g,
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.targetAmount !== undefined ? { targetAmount: String(input.targetAmount) } : {}),
                ...(input.targetDate !== undefined ? { targetDate: input.targetDate } : {}),
                updatedAt: new Date().toISOString(),
              }
            : g,
        ),
      )
      return { snap }
    },
    onError: (_e, _v, ctx) => restore(ctx?.snap),
    onSuccess: () => { if (!offline()) invalidate() },
  })
}

export function useDeleteGoal() {
  const { ownerId, offline, invalidate, snapshot, write, restore } = useSavingsContext()
  return useMutation({
    mutationFn: async (id: string) => {
      const enqueue = () =>
        enqueueMutation({ id: offlineMutationId('savings-goal', 'delete', id), ownerId, method: 'delete', endpoint: `/savings-goals/${id}`, body: {} })
      if (offline()) { await enqueue(); return }
      try { await api.delete(`/savings-goals/${id}`) }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return }; throw e }
    },
    onMutate: (id) => {
      const snap = snapshot()
      write((old) => old?.filter((g) => g.id !== id))
      return { snap }
    },
    onError: (_e, _id, ctx) => restore(ctx?.snap),
    onSuccess: () => { if (!offline()) invalidate() },
  })
}

/** "Guardé $X para esta meta". Suma al progreso; no mueve plata real. */
export function useAddContribution() {
  const { ownerId, offline, invalidate, snapshot, write, restore } = useSavingsContext()
  return useMutation({
    mutationFn: async ({ goalId, input }: { goalId: string; input: CreateContributionInput }) => {
      const enqueue = () =>
        enqueueMutation({ id: input.id!, ownerId, method: 'post', endpoint: `/savings-goals/${goalId}/contributions`, body: input })
      if (offline()) { await enqueue(); return }
      try { await api.post(`/savings-goals/${goalId}/contributions`, input) }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return }; throw e }
    },
    onMutate: ({ goalId, input }) => {
      input.id ??= uuid()
      const snap = snapshot()
      write((old) =>
        old?.map((g) =>
          g.id === goalId
            ? {
                ...g,
                saved: (parseDecimal(g.saved) + input.amount).toFixed(2),
                contributions: [
                  { id: input.id!, goalId, amount: String(input.amount), date: input.date, createdAt: new Date().toISOString() },
                  ...g.contributions,
                ],
              }
            : g,
        ),
      )
      return { snap }
    },
    onError: (_e, _v, ctx) => restore(ctx?.snap),
    onSuccess: () => { if (!offline()) invalidate() },
  })
}

/** Deshacer un aporte mal cargado. */
export function useDeleteContribution() {
  const { ownerId, offline, invalidate, snapshot, write, restore } = useSavingsContext()
  return useMutation({
    mutationFn: async ({ goalId, contributionId }: { goalId: string; contributionId: string }) => {
      const endpoint = `/savings-goals/${goalId}/contributions/${contributionId}`
      const enqueue = () =>
        enqueueMutation({ id: offlineMutationId('savings-contribution', 'delete', contributionId), ownerId, method: 'delete', endpoint, body: {} })
      if (offline()) { await enqueue(); return }
      try { await api.delete(endpoint) }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return }; throw e }
    },
    onMutate: ({ goalId, contributionId }) => {
      const snap = snapshot()
      write((old) =>
        old?.map((g) => {
          if (g.id !== goalId) return g
          const removed = g.contributions.find((c) => c.id === contributionId)
          return {
            ...g,
            saved: (parseDecimal(g.saved) - parseDecimal(removed?.amount ?? '0')).toFixed(2),
            contributions: g.contributions.filter((c) => c.id !== contributionId),
          }
        }),
      )
      return { snap }
    },
    onError: (_e, _v, ctx) => restore(ctx?.snap),
    onSuccess: () => { if (!offline()) invalidate() },
  })
}
