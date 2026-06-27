import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, isNotAvailable } from '@/config/api'
import { useOwnerStore } from '@/store/useOwnerStore'
import { walletsKey } from '@/features/wallets/api/useWallets'
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
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (input: CreateRecurringRuleInput) => {
      const { data } = await api.post<RecurringRule>('/recurring-rules', input)
      return data
    },
    onSuccess: invalidate,
  })
}

export function useUpdateRecurringRule() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateRecurringRuleInput }) => {
      const { data } = await api.put<RecurringRule>(`/recurring-rules/${id}`, input)
      return data
    },
    onSuccess: invalidate,
  })
}

export function useDeleteRecurringRule() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/recurring-rules/${id}`)
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
      await api.post(`/recurring-rules/${id}/confirm`)
    },
    onSuccess: () => {
      invalidate()
      // confirmar crea una transacción y cambia balances
      queryClient.invalidateQueries({ queryKey: ['transactions', ownerId] })
      queryClient.invalidateQueries({ queryKey: walletsKey(ownerId) })
    },
  })
}
