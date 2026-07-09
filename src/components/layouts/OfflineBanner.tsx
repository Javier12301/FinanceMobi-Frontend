import { useOnlineStore } from '@/store/useOnlineStore'
import { WifiOff } from 'lucide-react'

/** Aviso fijo cuando el server no responde. No se muestra hasta el primer chequeo (null). */
export function OfflineBanner() {
  const reachable = useOnlineStore((s) => s.serverReachable)
  if (reachable !== false) return null
  return (
    <div className="flex items-center justify-center gap-2 bg-muted px-4 py-1.5 text-xs text-muted-foreground">
      <WifiOff className="h-3.5 w-3.5" />
      <span>Sin conexión — trabajando con datos locales</span>
    </div>
  )
}
