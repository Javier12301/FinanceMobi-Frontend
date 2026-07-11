import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, isApiError } from '@/config/api'
import { env } from '@/config/env'
import { useOnlineStore } from '@/store/useOnlineStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { enqueueMutation, offlineMutationId } from '@/features/offline'
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../types/category'

export const categoriesKey = (ownerId: string | null) => ['categories', ownerId] as const

export function useCategories() {
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useQuery({ queryKey: categoriesKey(ownerId), enabled: !!ownerId, staleTime: 10 * 60 * 1000, queryFn: async () => (await api.get<Category[]>('/categories')).data })
}

function useCategoryContext() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  const offline = () => env.isNative && useOnlineStore.getState().serverReachable === false
  const invalidate = () => queryClient.invalidateQueries({ queryKey: categoriesKey(ownerId) })
  return { queryClient, ownerId, offline, invalidate }
}

function optimisticCategory(ownerId: string, input: CreateCategoryInput): Category {
  return {
    id: input.id!, ownerId, name: input.name, movementType: input.movementType,
    icon: input.icon ?? null, color: input.color ?? null, createdAt: new Date().toISOString(),
  }
}

export function useCreateCategory() {
  const { queryClient, ownerId, offline, invalidate } = useCategoryContext()
  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const enqueue = () => enqueueMutation({ id: input.id!, ownerId, method: 'post', endpoint: '/categories', body: input })
      if (offline()) { await enqueue(); return optimisticCategory(ownerId!, input) }
      try { return (await api.post<Category>('/categories', input)).data }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return optimisticCategory(ownerId!, input) }; throw e }
    },
    onMutate: (input) => {
      input.id ??= crypto.randomUUID()
      const snapshot = queryClient.getQueryData<Category[]>(categoriesKey(ownerId))
      const optimistic = optimisticCategory(ownerId!, input)
      queryClient.setQueryData<Category[]>(categoriesKey(ownerId), (old) => old ? [optimistic, ...old] : old)
      return { snapshot }
    },
    onError: (_e, _input, ctx) => queryClient.setQueryData(categoriesKey(ownerId), ctx?.snapshot),
    onSuccess: () => { if (!offline()) invalidate() },
  })
}

export function useUpdateCategory() {
  const { queryClient, ownerId, offline, invalidate } = useCategoryContext()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateCategoryInput }) => {
      const enqueue = () => enqueueMutation({ id: offlineMutationId('category', 'put', id), ownerId, method: 'put', endpoint: `/categories/${id}`, body: input })
      if (offline()) { await enqueue(); return null as unknown as Category }
      try { return (await api.put<Category>(`/categories/${id}`, input)).data }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return null as unknown as Category }; throw e }
    },
    onMutate: ({ id, input }) => { const snapshot = queryClient.getQueryData<Category[]>(categoriesKey(ownerId)); queryClient.setQueryData<Category[]>(categoriesKey(ownerId), (old) => old?.map((item) => item.id === id ? { ...item, ...input } : item)); return { snapshot } },
    onError: (_e, _input, ctx) => queryClient.setQueryData(categoriesKey(ownerId), ctx?.snapshot),
    onSuccess: () => { if (!offline()) invalidate() },
  })
}

export function useDeleteCategory() {
  const { queryClient, ownerId, offline, invalidate } = useCategoryContext()
  return useMutation({
    mutationFn: async (id: string) => {
      const enqueue = () => enqueueMutation({ id: offlineMutationId('category', 'delete', id), ownerId, method: 'delete', endpoint: `/categories/${id}`, body: {} })
      if (offline()) { await enqueue(); return }
      try { await api.delete(`/categories/${id}`) }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return }; throw e }
    },
    onMutate: (id) => { const snapshot = queryClient.getQueryData<Category[]>(categoriesKey(ownerId)); queryClient.setQueryData<Category[]>(categoriesKey(ownerId), (old) => old?.filter((item) => item.id !== id)); return { snapshot } },
    onError: (_e, _id, ctx) => queryClient.setQueryData(categoriesKey(ownerId), ctx?.snapshot),
    onSuccess: () => { if (!offline()) invalidate() },
  })
}
