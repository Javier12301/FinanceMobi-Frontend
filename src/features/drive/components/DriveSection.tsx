import { useState } from 'react'
import { HardDrive } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { IconBadge } from '@/components/elements/IconBadge'
import { errorMessage } from '@/config/api'
import { useConnectDrive } from '../api/useConnectDrive'

const DRIVE_FLAG = 'fv.driveConnected'

/**
 * Vinculación de Google Drive en Ajustes.
 * El contrato no expone estado de conexión (GET), así que el estado "conectado"
 * se recuerda localmente tras un connect exitoso.
 * ponytail: la obtención del authorization code se integra con GIS/Capacitor;
 * acá queda el punto de enganche y el POST /api/drive/connect ya cableado.
 */
export function DriveSection() {
  const connect = useConnectDrive()
  const [connected, setConnected] = useState(() => localStorage.getItem(DRIVE_FLAG) === '1')

  const onConnect = () => {
    // TODO(integración): abrir consentimiento OAuth (drive.file, offline) y obtener el code.
    toast.info('Iniciá el consentimiento de Google para vincular Drive (pendiente de integración OAuth).')
    // Ejemplo de cómo se enviaría una vez obtenido el code:
    // connect.mutate(code, { onSuccess: () => { setConnected(true); localStorage.setItem(DRIVE_FLAG, '1') }, onError: (e) => toast.error(errorMessage(e)) })
    void connect
    void errorMessage
  }

  const onDisconnect = () => {
    localStorage.removeItem(DRIVE_FLAG)
    setConnected(false)
    toast.success('Google Drive desconectado')
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
              <Button size="sm" variant="outline" className="border-destructive text-destructive" onClick={onDisconnect}>
                Desconectar
              </Button>
            </>
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
