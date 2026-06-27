import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/config/api'
import type { DelegationsResponse, InviteDelegationInput } from '../types/delegation'

const KEY = ['delegations'] as const

/** GET /api/delegations — delegaciones del usuario autenticado (v2). */
export function useDelegations() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data } = await api.get<DelegationsResponse>('/delegations')
      return data
    },
  })
}

/** POST /api/delegations — invitar delegado. */
export function useInviteDelegation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: InviteDelegationInput) => {
      const { data } = await api.post('/delegations', input)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

/** DELETE /api/delegations/:id — revocar acceso. */
export function useRevokeDelegation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/delegations/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
