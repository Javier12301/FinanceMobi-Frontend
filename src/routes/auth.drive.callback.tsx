import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useConnectDrive } from '@/features/drive'
import { errorMessage } from '@/config/api'

const searchSchema = z.object({
  code: z.string(),
  state: z.string(),
})

export const Route = createFileRoute('/auth/drive/callback')({
  validateSearch: searchSchema,
  component: DriveCallbackPage,
})

function DriveCallbackPage() {
  const { code, state } = Route.useSearch()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const connect = useConnectDrive()

  useEffect(() => {
    connect
      .mutateAsync({ code, state })
      .then(() => {
        void qc.invalidateQueries({ queryKey: ['me'] })
        toast.success('Google Drive conectado')
        void navigate({ to: '/settings' })
      })
      .catch((e: unknown) => {
        toast.error(errorMessage(e))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (connect.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-destructive">{errorMessage(connect.error)}</p>
        <a href="/settings" className="text-sm text-primary underline">
          Volver a Ajustes
        </a>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Conectando Google Drive…</p>
    </div>
  )
}
