import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/config/api'
import { useOwnerStore } from '@/store/useOwnerStore'
import type { Category, CreateCategoryInput } from '../types/category'

const categoriesKey = (ownerId: string | null) => ['categories', ownerId] as const

/** GET /api/categories — categorías del owner activo. */
export function useCategories() {
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useQuery({
    queryKey: categoriesKey(ownerId),
    enabled: !!ownerId,
    queryFn: async () => {
      const { data } = await api.get<Category[]>('/categories')
      return data
    },
  })
}

/** POST /api/categories */
export function useCreateCategory() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const { data } = await api.post<Category>('/categories', input)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey(ownerId) }),
  })
}
