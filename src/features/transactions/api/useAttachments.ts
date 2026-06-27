import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/config/api'

export interface TransactionAttachment {
  id: string
  transactionId: string
  googleFileId: string
  mimeType: string
  uploadedAt: string
}

const attachmentsKey = (txnId: string) => ['attachments', txnId] as const

/** GET /api/transactions/:id/attachments */
export function useAttachments(transactionId: string | null) {
  return useQuery({
    queryKey: attachmentsKey(transactionId ?? ''),
    enabled: !!transactionId,
    queryFn: async () => {
      const { data } = await api.get<TransactionAttachment[]>(
        `/transactions/${transactionId}/attachments`,
      )
      return data
    },
  })
}

/**
 * POST /api/transactions/:id/attachments — Stub 501 en el contrato v1.
 * Se cablea para activarse cuando el backend defina límites de tipo/tamaño.
 */
export function useUploadAttachment(transactionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post<TransactionAttachment>(
        `/transactions/${transactionId}/attachments`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attachmentsKey(transactionId) }),
  })
}
