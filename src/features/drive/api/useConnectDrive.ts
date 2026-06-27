import { useMutation } from '@tanstack/react-query'
import { api } from '@/config/api'

/**
 * POST /api/drive/connect — vincula Google Drive.
 * El backend cifra y persiste el refresh token y crea la carpeta raíz.
 *
 * Nota: obtener el refresh token requiere el flujo OAuth offline de Google
 * (scope drive.file). El backend hace el intercambio code -> refreshToken,
 * por eso aquí se envía el authorization code obtenido del consentimiento.
 */
export function useConnectDrive() {
  return useMutation({
    mutationFn: async (refreshToken: string) => {
      const { data } = await api.post<{ message: string }>('/drive/connect', { refreshToken })
      return data
    },
  })
}
