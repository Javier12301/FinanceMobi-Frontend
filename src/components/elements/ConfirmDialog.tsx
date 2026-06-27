import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from './ResponsiveModal'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Tipo de entidad, ej: "billetera". */
  label: string
  /** Nombre concreto, ej: "Caja diaria". */
  name: string
  onConfirm: () => void
  loading?: boolean
}

/** Confirmación de eliminación (patrón del prototipo: ícono rojo + acción irreversible). */
export function ConfirmDialog({
  open,
  onOpenChange,
  label,
  name,
  onConfirm,
  loading,
}: ConfirmDialogProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Eliminar ${label}`}
      className="sm:max-w-md"
    >
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Trash2 size={22} />
        </span>
        <p className="text-sm text-muted-foreground">
          ¿Estás seguro que querés eliminar <strong className="text-foreground">{name}</strong>? Esta
          acción no se puede deshacer.
        </p>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button variant="destructive" className="flex-1" onClick={onConfirm} disabled={loading}>
          {loading ? 'Eliminando…' : 'Eliminar'}
        </Button>
      </div>
    </ResponsiveModal>
  )
}
