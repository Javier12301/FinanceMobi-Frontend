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
 * POST /api/transactions/:id/attachments — sube 1+ archivos a Drive (v2).
 * Límites del contrato: máx 3 por request, 5MB c/u, MIME jpeg/png/webp/pdf.
 */
export function useUploadAttachment(transactionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (files: File[]) => {
      const form = new FormData()
      for (const f of files) form.append('file', f)
      const { data } = await api.post<TransactionAttachment[]>(
        `/transactions/${transactionId}/attachments`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attachmentsKey(transactionId) }),
  })
}

/** DELETE /api/transactions/:id/attachments/:attId — borra el archivo de Drive + DB (v2). */
export function useDeleteAttachment(transactionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      await api.delete(`/transactions/${transactionId}/attachments/${attachmentId}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attachmentsKey(transactionId) }),
  })
}
