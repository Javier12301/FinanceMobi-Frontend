import { useRef } from 'react'
import { ExternalLink, FileText, Paperclip, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { IconBadge } from '@/components/elements/IconBadge'
import { errorMessage } from '@/config/api'
import { useAuthStore } from '@/store/useAuthStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useAttachments, useDeleteAttachment, useUploadAttachment } from '../api/useAttachments'

// Límites del contrato v2 (§5.8).
const MAX_FILES = 3
const MAX_SIZE = 5 * 1024 * 1024
const MIME_OK = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

/** Lista + sube + borra comprobantes de una transacción. Gateado por driveConnected e isReadOnly. */
export function AttachmentsPanel({ transactionId }: { transactionId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isReadOnly = useOwnerStore((s) => s.isReadOnly)
  const driveConnected = useAuthStore((s) => s.user?.driveConnected ?? false)
  const { data: attachments } = useAttachments(transactionId)
  const upload = useUploadAttachment(transactionId)
  const del = useDeleteAttachment(transactionId)

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // permite re-elegir el mismo archivo
    if (files.length === 0) return
    if (files.length > MAX_FILES) return toast.error(`Máximo ${MAX_FILES} archivos`)
    for (const f of files) {
      if (f.size > MAX_SIZE) return toast.error(`"${f.name}" supera los 5 MB`)
      if (!MIME_OK.includes(f.type)) return toast.error(`"${f.name}": formato no permitido`)
    }
    upload.mutate(files, {
      onSuccess: () => toast.success('Comprobante adjuntado'),
      onError: (err) => toast.error(errorMessage(err)),
    })
  }

  const onDelete = (id: string) =>
    del.mutate(id, {
      onSuccess: () => toast.success('Comprobante eliminado'),
      onError: (err) => toast.error(errorMessage(err)),
    })

  return (
    <div className="border-b px-5 py-4">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-sm font-medium">Comprobantes</span>
        {!isReadOnly && driveConnected && (
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            <Paperclip size={14} /> {upload.isPending ? 'Subiendo…' : 'Adjuntar'}
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={MIME_OK.join(',')}
        className="hidden"
        onChange={onPick}
      />

      {!driveConnected && (
        <p className="text-xs text-muted-foreground">
          Conectá Google Drive en{' '}
          <Link to="/settings" className="text-primary underline">
            Ajustes
          </Link>{' '}
          para adjuntar comprobantes.
        </p>
      )}

      {attachments && attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border p-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <IconBadge icon={FileText} size="sm" />
                <span className="truncate text-xs text-muted-foreground">{a.mimeType}</span>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={`https://drive.google.com/file/d/${a.googleFileId}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-primary"
                  aria-label="Ver comprobante"
                >
                  <ExternalLink size={15} />
                </a>
                {!isReadOnly && (
                  <button
                    onClick={() => onDelete(a.id)}
                    disabled={del.isPending}
                    className="p-1.5 text-destructive"
                    aria-label="Eliminar comprobante"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        driveConnected && <p className="text-xs text-muted-foreground">Sin comprobantes.</p>
      )}
    </div>
  )
}
