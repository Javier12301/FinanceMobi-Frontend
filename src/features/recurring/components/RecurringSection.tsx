import { Repeat, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Money } from '@/components/elements/Money'
import { errorMessage } from '@/config/api'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useCategories } from '@/features/categories'
import {
  useRecurringRules,
  useUpdateRecurringRule,
  useDeleteRecurringRule,
} from '../api/useRecurring'

/** Sección "Movimientos recurrentes" en Ajustes: ver / pausar / borrar reglas. */
export function RecurringSection() {
  const isReadOnly = useOwnerStore((s) => s.isReadOnly)
  const { data: rules } = useRecurringRules()
  const { data: categories } = useCategories()
  const update = useUpdateRecurringRule()
  const del = useDeleteRecurringRule()

  return (
    <section>
      <div className="rounded-xl border bg-card">
        {!rules || rules.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-4 text-sm text-muted-foreground">
            <Repeat size={16} />
            Activá "Repetir cada mes" al cargar un movimiento para crear una regla.
          </div>
        ) : (
          rules.map((r) => {
            const catName = categories?.find((c) => c.id === r.categoryId)?.name ?? 'Movimiento'
            return (
              <div key={r.id} className="flex items-center justify-between border-b px-5 py-3.5 last:border-b-0">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.description || catName}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Money amount={r.amount} movementType={r.movementType} className="text-xs" />
                    <span>· día {r.dayOfMonth}</span>
                    {r.autoPost && <span>· automático</span>}
                    {!r.active && <span className="text-destructive">· pausado</span>}
                  </div>
                </div>
                {!isReadOnly && (
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={r.active}
                      onCheckedChange={(active) =>
                        update.mutate(
                          { id: r.id, input: { active } },
                          { onError: (err) => toast.error(errorMessage(err)) },
                        )
                      }
                    />
                    <button
                      onClick={() =>
                        del.mutate(r.id, {
                          onSuccess: () => toast.success('Regla eliminada'),
                          onError: (err) => toast.error(errorMessage(err)),
                        })
                      }
                      className="text-destructive"
                      aria-label="Eliminar regla"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
