import { CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/elements/Money'
import { IconBadge } from '@/components/elements/IconBadge'
import { errorMessage } from '@/config/api'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useCategories } from '@/features/categories'
import { usePendingRecurring, useConfirmRecurring } from '../api/useRecurring'

/** Tarjeta "Por confirmar (N)" del dashboard. Oculta si no hay pendientes. */
export function PendingRecurringCard() {
  const isReadOnly = useOwnerStore((s) => s.isReadOnly)
  const { data: pending } = usePendingRecurring()
  const { data: categories } = useCategories()
  const confirm = useConfirmRecurring()

  if (!pending || pending.length === 0) return null

  const onConfirm = (id: string) =>
    confirm.mutate(id, {
      onSuccess: () => toast.success('Movimiento confirmado'),
      onError: (err) => toast.error(errorMessage(err)),
    })

  return (
    <div className="mb-5 rounded-xl border border-primary/30 bg-primary-soft/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <IconBadge icon={CalendarClock} variant="primary" size="sm" />
        <span className="text-sm font-semibold">Por confirmar ({pending.length})</span>
      </div>
      <div className="space-y-2">
        {pending.map((r) => {
          const catName = categories?.find((c) => c.id === r.categoryId)?.name ?? 'Movimiento'
          return (
            <div key={r.id} className="flex items-center justify-between rounded-lg bg-card px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r.description || catName}</div>
                <Money amount={r.amount} movementType={r.movementType} className="text-xs" />
              </div>
              {!isReadOnly && (
                <Button size="sm" onClick={() => onConfirm(r.id)} disabled={confirm.isPending}>
                  Confirmar
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
