import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api } from '@/config/api'
import { useAuthStore } from '@/store/useAuthStore'
import type { AuthResponse, GoogleLoginInput } from '../types/auth'

/** POST /api/auth/google — login/registro con Google ID token. */
export function useGoogleLogin() {
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)

  return useMutation({
    mutationFn: async (input: GoogleLoginInput) => {
      const { data } = await api.post<AuthResponse>('/auth/google', input)
      return data
    },
    onSuccess: (data) => {
      setToken(data.token)
      navigate({ to: '/dashboard' })
    },
  })
}
