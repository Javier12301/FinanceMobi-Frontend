import { useQuery } from '@tanstack/react-query'
import { api } from '@/config/api'
import { useAuthStore, type MeProfile } from '@/store/useAuthStore'

/** GET /api/me — perfil del usuario autenticado (name, driveConnected). No usa X-Owner-Id. */
export function useMe() {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: ['me'],
    enabled: !!token,
    queryFn: async () => {
      const { data } = await api.get<MeProfile>('/me')
      useAuthStore.getState().setProfile(data)
      return data
    },
  })
}
