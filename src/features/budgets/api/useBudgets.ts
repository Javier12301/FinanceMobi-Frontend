import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, isApiError, isNotAvailable } from '@/config/api'
import { env } from '@/config/env'
import { useOnlineStore } from '@/store/useOnlineStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { enqueueMutation, offlineMutationId } from '@/features/offline'
import type { Budget, CreateBudgetInput, UpdateBudgetInput } from '../types/budget'

export const budgetsKey = (ownerId: string | null) => ['budgets', ownerId] as const
export const currentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

export function useBudgets() {
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useQuery({ queryKey: budgetsKey(ownerId), enabled: !!ownerId, retry: false, queryFn: async () => { try { return (await api.get<Budget[]>('/budgets')).data } catch (e) { if (isNotAvailable(e)) return []; throw e } } })
}

function useBudgetContext() {
  const queryClient = useQueryClient(); const ownerId = useOwnerStore((s) => s.activeOwnerId)
  const offline = () => env.isNative && useOnlineStore.getState().serverReachable === false
  return { queryClient, ownerId, offline, invalidate: () => queryClient.invalidateQueries({ queryKey: budgetsKey(ownerId) }) }
}

export function useCreateBudget() {
  const { queryClient, ownerId, offline, invalidate } = useBudgetContext()
  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      const enqueue = () => enqueueMutation({ id: input.id!, ownerId, method: 'post', endpoint: '/budgets', body: input })
      if (offline()) { await enqueue(); return null as unknown as Budget }
      try { return (await api.post<Budget>('/budgets', input)).data } catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return null as unknown as Budget }; throw e }
    },
    onMutate: (input) => { input.id ??= crypto.randomUUID(); const snapshot = queryClient.getQueryData<Budget[]>(budgetsKey(ownerId)); const now = new Date().toISOString(); queryClient.setQueryData<Budget[]>(budgetsKey(ownerId), (old) => old ? [{ id: input.id!, ownerId: ownerId!, categoryId: input.categoryId, month: input.month, limit: String(input.limit), createdAt: now, updatedAt: now }, ...old] : old); return { snapshot } },
    onError: (_e, _input, ctx) => queryClient.setQueryData(budgetsKey(ownerId), ctx?.snapshot),
    onSuccess: () => { if (!offline()) invalidate() },
  })
}

export function useUpdateBudget() {
  const { queryClient, ownerId, offline, invalidate } = useBudgetContext()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateBudgetInput }) => { const enqueue = () => enqueueMutation({ id: offlineMutationId('budget', 'put', id), ownerId, method: 'put', endpoint: `/budgets/${id}`, body: input }); if (offline()) { await enqueue(); return null as unknown as Budget }; try { return (await api.put<Budget>(`/budgets/${id}`, input)).data } catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return null as unknown as Budget }; throw e } },
    onMutate: ({ id, input }) => { const snapshot = queryClient.getQueryData<Budget[]>(budgetsKey(ownerId)); queryClient.setQueryData<Budget[]>(budgetsKey(ownerId), (old) => old?.map((b) => b.id === id ? { ...b, limit: String(input.limit), updatedAt: new Date().toISOString() } : b)); return { snapshot } },
    onError: (_e, _input, ctx) => queryClient.setQueryData(budgetsKey(ownerId), ctx?.snapshot), onSuccess: () => { if (!offline()) invalidate() },
  })
}

export function useDeleteBudget() {
  const { queryClient, ownerId, offline, invalidate } = useBudgetContext()
  return useMutation({
    mutationFn: async (id: string) => { const enqueue = () => enqueueMutation({ id: offlineMutationId('budget', 'delete', id), ownerId, method: 'delete', endpoint: `/budgets/${id}`, body: {} }); if (offline()) { await enqueue(); return }; try { await api.delete(`/budgets/${id}`) } catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return }; throw e } },
    onMutate: (id) => { const snapshot = queryClient.getQueryData<Budget[]>(budgetsKey(ownerId)); queryClient.setQueryData<Budget[]>(budgetsKey(ownerId), (old) => old?.filter((b) => b.id !== id)); return { snapshot } },
    onError: (_e, _id, ctx) => queryClient.setQueryData(budgetsKey(ownerId), ctx?.snapshot), onSuccess: () => { if (!offline()) invalidate() },
  })
}
