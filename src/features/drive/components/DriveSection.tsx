import { HardDrive } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { IconBadge } from '@/components/elements/IconBadge'
import { useAuthStore } from '@/store/useAuthStore'
import { errorMessage } from '@/config/api'
import { useGetDriveAuthUrl, useDisconnectDrive } from '../api/useConnectDrive'

export function DriveSection() {
  const connected = useAuthStore((s) => s.user?.driveConnected ?? false)
  const getAuthUrl = useGetDriveAuthUrl()
  const disconnect = useDisconnectDrive()

  const onConnect = async () => {
    try {
      const { url } = await getAuthUrl.mutateAsync()
      window.location.href = url
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const onDisconnect = () => {
    disconnect.mutate(undefined, {
      onSuccess: () => toast.success('Google Drive desconectado'),
      onError: (e) => toast.error(errorMessage(e)),
    })
  }

  return (
    <section>
      <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Google Drive
      </div>
      <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <IconBadge icon={HardDrive} />
          <div>
            <div className="text-sm font-medium">Google Drive</div>
            <div className="text-xs text-muted-foreground">Comprobantes en tu propia cuenta</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {connected ? (
            <>
              <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                Conectado
              </span>
              <Button size="sm" variant="outline" onClick={onDisconnect} disabled={disconnect.isPending}>
                {disconnect.isPending ? 'Desconectando…' : 'Desconectar'}
              </Button>
            </>
          ) : (
            <>
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Sin conectar
              </span>
              <Button size="sm" onClick={onConnect} disabled={getAuthUrl.isPending}>
                {getAuthUrl.isPending ? 'Redirigiendo…' : 'Conectar'}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
