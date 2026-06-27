import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/config/api'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Devuelve una función de logout: revoca la sesión en el backend (POST /api/auth/logout)
 * y limpia el estado local. Limpia igual aunque el request falle.
 */
export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clear = useAuthStore((s) => s.clear)

  return async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      /* aunque falle, cerramos sesión localmente */
    } finally {
      clear()
      queryClient.clear()
      navigate({ to: '/login' })
    }
  }
}
