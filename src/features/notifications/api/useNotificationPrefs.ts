import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, isNotAvailable } from '@/config/api'
import type { NotificationPrefs, UpdateNotificationPrefsInput } from '../types/notificationPrefs'

const KEY = ['notification-prefs'] as const

// GET /api/me/notification-prefs — solo JWT. null si endpoint dormido.
export function useNotificationPrefs() {
  return useQuery({
    queryKey: KEY,
    retry: false,
    queryFn: async () => {
      try {
        const { data } = await api.get<NotificationPrefs>('/me/notification-prefs')
        return data
      } catch (e) {
        if (isNotAvailable(e)) return null
        throw e
      }
    },
  })
}

export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateNotificationPrefsInput) => {
      const { data } = await api.put<NotificationPrefs>('/me/notification-prefs', input)
      return data
    },
    onSuccess: (data) => queryClient.setQueryData(KEY, data),
  })
}
