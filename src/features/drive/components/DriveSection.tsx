import { HardDrive } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { IconBadge } from '@/components/elements/IconBadge'
import { useAuthStore } from '@/store/useAuthStore'
import { useConnectDrive } from '../api/useConnectDrive'

/**
 * Vinculación de Google Drive en Ajustes.
 * El estado "conectado" viene de GET /me (driveConnected). v2.
 * ponytail: la obtención del refreshToken (consentimiento OAuth offline) se integra
 * con GIS/Capacitor; acá queda el enganche y el POST /api/drive/connect ya cableado.
 * Pendiente documentado en docs/para-backend/frontend-pendientes-v3.md.
 */
export function DriveSection() {
  const connect = useConnectDrive()
  const connected = useAuthStore((s) => s.user?.driveConnected ?? false)

  const onConnect = () => {
    // TODO(integración): abrir consentimiento OAuth (drive.file, offline) y obtener el refreshToken.
    toast.info('Iniciá el consentimiento de Google para vincular Drive (pendiente de integración OAuth).')
    // Una vez obtenido el refreshToken:
    // connect.mutate(refreshToken, { onSuccess: () => toast.success('Google Drive conectado') })
    void connect
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
            <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
              Conectado
            </span>
          ) : (
            <>
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Sin conectar
              </span>
              <Button size="sm" onClick={onConnect} disabled={connect.isPending}>
                Conectar
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
