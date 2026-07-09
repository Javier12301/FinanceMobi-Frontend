import { Plus, Repeat, HandCoins } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet'
import { useTransactionModal } from '@/features/transactions'
import { useDebtModal } from '@/features/debts'

interface QuickActionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Bottom sheet de acciones rápidas: Registrar movimiento, Movimiento fijo, Deuda. */
export function QuickActionsSheet({ open, onOpenChange }: QuickActionsSheetProps) {
  const openTransaction = useTransactionModal((s) => s.openNew)
  const openDebt = useDebtModal((s) => s.open)

  // ponytail: cerrar sheet después de seleccionar acción
  const handleAction = (action: () => void) => {
    action()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="gap-0 p-0">
        <SheetHeader className="border-b p-4">
          <h2 className="text-base font-semibold">¿Qué querés registrar?</h2>
        </SheetHeader>

        <div className="space-y-2 px-4 py-3 pb-[calc(0.75rem_+_var(--safe-area-inset-bottom))]">
          {/* Registrar movimiento */}
          <button
            onClick={() => handleAction(() => openTransaction())}
            className="flex w-full items-center gap-4 rounded-lg bg-surface px-4 py-4 text-left transition-colors hover:bg-surface/80 active:scale-95 min-h-[56px]"
          >
            <Plus size={24} className="flex-shrink-0 text-primary" />
            <div>
              <div className="font-medium text-foreground">Registrar movimiento</div>
              <div className="text-xs text-muted-foreground">Ingreso o egreso</div>
            </div>
          </button>

          {/* Movimiento fijo */}
          <button
            onClick={() => handleAction(() => openTransaction({ repeat: true }))}
            className="flex w-full items-center gap-4 rounded-lg bg-surface px-4 py-4 text-left transition-colors hover:bg-surface/80 active:scale-95 min-h-[56px]"
          >
            <Repeat size={24} className="flex-shrink-0 text-primary" />
            <div>
              <div className="font-medium text-foreground">Movimiento fijo</div>
              <div className="text-xs text-muted-foreground">Que se repite cada mes</div>
            </div>
          </button>

          {/* Deuda */}
          <button
            onClick={() => handleAction(() => openDebt())}
            className="flex w-full items-center gap-4 rounded-lg bg-surface px-4 py-4 text-left transition-colors hover:bg-surface/80 active:scale-95 min-h-[56px]"
          >
            <HandCoins size={24} className="flex-shrink-0 text-primary" />
            <div>
              <div className="font-medium text-foreground">Deuda</div>
              <div className="text-xs text-muted-foreground">Préstamo o crédito</div>
            </div>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
