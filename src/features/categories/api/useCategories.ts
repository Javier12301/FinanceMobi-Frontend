import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/config/api'
import { useOwnerStore } from '@/store/useOwnerStore'
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../types/category'

const categoriesKey = (ownerId: string | null) => ['categories', ownerId] as const

/** GET /api/categories — categorías del owner activo. */
export function useCategories() {
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useQuery({
    queryKey: categoriesKey(ownerId),
    enabled: !!ownerId,
    // Lookup estable: evita el refetch en background al abrir el form (re-render/jank).
    // Las mutaciones ya invalidan la key.
    staleTime: 10 * 60 * 1000,
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

/**
 * PUT /api/categories/:id — editar. ponytail: el backend v2 no lo expone aún;
 * la UI usa isNotAvailable() para mostrar "próximamente". Enciende solo al publicarse.
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateCategoryInput }) => {
      const { data } = await api.put<Category>(`/categories/${id}`, input)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey(ownerId) }),
  })
}

/** DELETE /api/categories/:id — ponytail: idem PUT, defensivo hasta que el backend lo exponga. */
export function useDeleteCategory() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey(ownerId) }),
  })
}
