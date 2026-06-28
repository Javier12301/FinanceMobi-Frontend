import { useMutation } from '@tanstack/react-query'
import { api } from '@/config/api'

/** GET /api/drive/auth-url — obtiene la URL de consentimiento de Google + state CSRF. */
export function useGetDriveAuthUrl() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<{ url: string; state: string }>('/drive/auth-url')
      return data
    },
  })
}

/** POST /api/drive/connect — intercambia el code de Google por tokens y los persiste cifrados. */
export function useConnectDrive() {
  return useMutation({
    mutationFn: async ({ code, state }: { code: string; state: string }) => {
      const { data } = await api.post<{ message: string }>('/drive/connect', { code, state })
      return data
    },
  })
}
