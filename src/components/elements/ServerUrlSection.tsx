import { useState } from 'react'
import { Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getServerUrl, setServerUrl } from '@/config/env'

/** Solo en el APK: la URL del backend se configura acá (en web sale del .env). */
export function ServerUrlSection() {
  const [url, setUrl] = useState(getServerUrl() ?? '')
  return (
    <section>
      <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Servidor</div>
      <div className="rounded-xl border bg-card px-5 py-4">
        <div className="mb-3 flex items-center gap-2.5">
          <Server size={16} className="text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">URL del servidor</div>
            <div className="text-xs text-muted-foreground">Ej: http://192.168.0.10:3000 (tu backend en la red)</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://IP-o-dominio:3000"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <Button className="h-11" disabled={!url.trim()} onClick={() => setServerUrl(url)}>
            Guardar
          </Button>
        </div>
      </div>
    </section>
  )
}
