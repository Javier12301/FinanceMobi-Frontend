import { Repeat } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/config/api'
import { useUpdateRecurringRule, useDeleteRecurringRule } from '../api/useRecurring'

/**
 * Aviso dentro de la edición de un movimiento que nació de una regla recurrente.
 * Explica de dónde viene el cobro y deja pausar o quitar la recurrencia sin ir a Ajustes.
 * ponytail: deshacer ESTE cobro puntual = borrar el movimiento (el DELETE ya revierte el balance).
 */
export function RecurringBanner({ ruleId, onDone }: { ruleId: string; onDone: () => void }) {
  const pauseRule = useUpdateRecurringRule()
  const removeRule = useDeleteRecurringRule()
  const busy = pauseRule.isPending || removeRule.isPending

  const pause = () =>
    pauseRule.mutate(
      { id: ruleId, input: { active: false } },
      {
        onSuccess: () => {
          toast.success('Recurrencia pausada. No se cobrará más hasta que la reactives.')
          onDone()
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    )

  const remove = () =>
    removeRule.mutate(ruleId, {
      onSuccess: () => {
        toast.success('Recurrencia quitada. Este movimiento queda como uno normal.')
        onDone()
      },
      onError: (e) => toast.error(errorMessage(e)),
    })

  return (
    <div className="rounded-lg border border-primary/40 bg-primary-soft p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
        <Repeat size={16} />
        Este movimiento se repite cada mes
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Se generó automáticamente por una regla. Para deshacer solo este cobro, borrá el movimiento.
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={pause}>
          Pausar
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={remove}>
          Quitar recurrencia
        </Button>
      </div>
    </div>
  )
}
