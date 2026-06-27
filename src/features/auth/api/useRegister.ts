import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api } from '@/config/api'
import { useAuthStore } from '@/store/useAuthStore'
import type { AuthResponse, RegisterInput } from '../types/auth'

/** POST /api/auth/register — registro con name/email/contraseña (v2). Abre sesión directo. */
export function useRegister() {
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await api.post<AuthResponse>('/auth/register', input)
      return data
    },
    onSuccess: (data) => {
      setToken(data.token)
      navigate({ to: '/dashboard' })
    },
  })
}
