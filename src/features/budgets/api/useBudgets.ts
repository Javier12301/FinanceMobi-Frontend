import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, isNotAvailable } from '@/config/api'
import { useOwnerStore } from '@/store/useOwnerStore'
import type { Budget, CreateBudgetInput, UpdateBudgetInput } from '../types/budget'

const budgetsKey = (ownerId: string | null) => ['budgets', ownerId] as const

/** "YYYY-MM" del mes actual (hora local; toISOString correría el mes en el borde en TZ negativas). */
export const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * GET /api/budgets — presupuestos del owner.
 * ponytail: feature dormida; si el backend aún no lo expone (404/501), devuelve [] sin error rojo.
 */
export function useBudgets() {
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useQuery({
    queryKey: budgetsKey(ownerId),
    enabled: !!ownerId,
    retry: false,
    queryFn: async () => {
      try {
        const { data } = await api.get<Budget[]>('/budgets')
        return data
      } catch (e) {
        if (isNotAvailable(e)) return [] as Budget[]
        throw e
      }
    },
  })
}

export function useCreateBudget() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      const { data } = await api.post<Budget>('/budgets', input)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsKey(ownerId) }),
  })
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateBudgetInput }) => {
      const { data } = await api.put<Budget>(`/budgets/${id}`, input)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsKey(ownerId) }),
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/budgets/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsKey(ownerId) }),
  })
}
