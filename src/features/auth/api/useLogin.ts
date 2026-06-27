import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api } from '@/config/api'
import { useAuthStore } from '@/store/useAuthStore'
import type { AuthResponse, LoginInput } from '../types/auth'

/** POST /api/auth/login — credenciales clásicas. */
export function useLogin() {
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await api.post<AuthResponse>('/auth/login', input)
      return data
    },
    onSuccess: (data) => {
      setToken(data.token)
      navigate({ to: '/dashboard' })
    },
  })
}
