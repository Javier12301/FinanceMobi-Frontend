import { useEffect, useState, type FormEvent } from 'react'
import { PiggyBank, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IconBadge } from '@/components/elements/IconBadge'
import { ResponsiveModal } from '@/components/elements/ResponsiveModal'
import { errorMessage } from '@/config/api'
import { cn } from '@/lib/utils'
import { formatCurrency, parseDecimal } from '@/utils/formatCurrency'
import { dateInputToIso, dateToInput } from '@/utils/formatDate'
import { useOwnerStore } from '@/store/useOwnerStore'
import {
  useSavingsGoals,
  useCreateGoal,
  useDeleteGoal,
  useAddContribution,
} from '../api/useSavings'
import type { SavingsGoal } from '../types/savings'

/**
 * Objetivos de ahorro: un TRACKER tipo "sobre". No mueve plata real ni toca billeteras —
 * el usuario anota cuánto guardó y la barra muestra cuánto lleva.
 */
export function SavingsGoalsSection() {
  const isReadOnly = useOwnerStore((s) => s.isReadOnly)
  const { data: goals } = useSavingsGoals()
  const [newGoalOpen, setNewGoalOpen] = useState(false)
  const [contributingTo, setContributingTo] = useState<SavingsGoal | null>(null)

  const list = goals ?? []

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3.5">
        <div className="flex items-center gap-2">
          <IconBadge icon={PiggyBank} size="sm" />
          <span className="text-sm font-semibold">Objetivos de ahorro</span>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setNewGoalOpen(true)}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Agregar objetivo de ahorro"
            title="Agregar objetivo de ahorro"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      <div className="px-2 py-1.5">
        {list.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Una meta de ahorro es como un sobre: cada vez que guardás plata para ella, tocás{' '}
            <span className="font-medium text-foreground">+</span> y anotás cuánto. No mueve dinero de
            tus billeteras.
          </p>
        ) : (
          list.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              readOnly={isReadOnly}
              onContribute={() => setContributingTo(goal)}
            />
          ))
        )}
      </div>

      <NewGoalModal open={newGoalOpen} onClose={() => setNewGoalOpen(false)} />
      <ContributionModal goal={contributingTo} onClose={() => setContributingTo(null)} />
    </section>
  )
}

function GoalRow({
  goal,
  readOnly,
  onContribute,
}: {
  goal: SavingsGoal
  readOnly: boolean
  onContribute: () => void
}) {
  const del = useDeleteGoal()

  const saved = parseDecimal(goal.saved)
  const target = parseDecimal(goal.targetAmount)
  const pct = target > 0 ? Math.round((saved / target) * 100) : 0
  const remaining = Math.max(0, target - saved)
  const done = remaining === 0

  return (
    <div className="rounded-lg px-2 py-2.5 hover:bg-accent/40">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {goal.name} {done && <span className="text-success">· ¡listo!</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(goal.saved)} de {formatCurrency(goal.targetAmount)} · {pct}%
          </div>
        </div>
        {!readOnly && (
          <div className="flex shrink-0 items-center gap-1">
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={onContribute}>
              <Plus size={14} /> Guardé
            </Button>
            <button
              onClick={() =>
                del.mutate(goal.id, {
                  onSuccess: () => toast.success('Objetivo eliminado'),
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
              className="p-1 text-destructive"
              aria-label={`Eliminar ${goal.name}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Barra de progreso (mismo idiom que los presupuestos del resumen). */}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
        <div
          className={cn('h-full rounded-full transition-all', done ? 'bg-success' : 'bg-primary')}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <div className="mt-1.5 text-xs text-muted-foreground">
        {done ? '¡Llegaste a la meta!' : `Te falta ${formatCurrency(String(remaining))}`}
        {!done && monthlyHint(goal, remaining)}
      </div>
    </div>
  )
}

/** "Guardá ~$N por mes para llegar a la fecha." Solo si la meta tiene fecha objetivo futura. */
function monthlyHint(goal: SavingsGoal, remaining: number) {
  if (!goal.targetDate) return null
  const months = monthsUntil(goal.targetDate)
  if (months <= 0) return ' · la fecha objetivo ya pasó'
  const perMonth = remaining / months
  return ` · guardá ${formatCurrency(String(perMonth))} por mes para llegar`
}

function monthsUntil(iso: string): number {
  const target = new Date(iso)
  const now = new Date()
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
  // El mes en curso cuenta: una meta para fin de este mes exige guardar todo en 1 mes, no en 0.
  return months + 1 > 0 ? months + 1 : 0
}

function NewGoalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateGoal()
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')

  useEffect(() => {
    if (!open) return
    setName('')
    setTargetAmount('')
    setTargetDate('')
  }, [open])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const amount = Number(targetAmount)
    if (!name.trim()) return toast.error('Ponele un nombre a la meta')
    if (!amount || amount <= 0) return toast.error('La meta debe ser mayor a 0')

    create.mutate(
      {
        name: name.trim(),
        targetAmount: amount,
        ...(targetDate ? { targetDate: dateInputToIso(targetDate) } : {}),
      },
      {
        onSuccess: () => {
          toast.success('Objetivo creado')
          onClose()
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    )
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Nuevo objetivo de ahorro"
      className="sm:max-w-md"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="goal-form" disabled={create.isPending}>
            {create.isPending ? 'Guardando…' : 'Crear'}
          </Button>
        </div>
      }
    >
      <form id="goal-form" onSubmit={submit} className="flex flex-col gap-3 py-1">
        <div className="space-y-1.5">
          <Label htmlFor="g-name">¿Para qué ahorrás?</Label>
          <Input id="g-name" placeholder="Ej: Vacaciones" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="g-amount">¿Cuánto querés juntar?</Label>
          <Input
            id="g-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="g-date">
            ¿Para cuándo? <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Input id="g-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Si ponés una fecha, te calculamos cuánto guardar por mes.
          </p>
        </div>

        <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground">
          Esto no mueve plata de tus billeteras: es un seguimiento. Cada vez que guardes algo, tocá
          «Guardé» y anotá cuánto.
        </p>
      </form>
    </ResponsiveModal>
  )
}

function ContributionModal({ goal, onClose }: { goal: SavingsGoal | null; onClose: () => void }) {
  const add = useAddContribution()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(dateToInput(new Date()))

  useEffect(() => {
    if (!goal) return
    setAmount('')
    setDate(dateToInput(new Date()))
  }, [goal])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!goal) return
    const value = Number(amount)
    if (!value || value <= 0) return toast.error('Ingresá un monto mayor a 0')

    add.mutate(
      { goalId: goal.id, input: { amount: value, date: dateInputToIso(date) } },
      {
        onSuccess: () => {
          toast.success('¡Anotado!')
          onClose()
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    )
  }

  return (
    <ResponsiveModal
      open={!!goal}
      onOpenChange={(o) => !o && onClose()}
      title={goal ? `Guardé para "${goal.name}"` : ''}
      className="sm:max-w-sm"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="contrib-form" disabled={add.isPending}>
            {add.isPending ? 'Guardando…' : 'Anotar'}
          </Button>
        </div>
      }
    >
      <form id="contrib-form" onSubmit={submit} className="flex flex-col gap-3 py-1">
        <div className="rounded-xl bg-surface p-4 text-center">
          <div className="mb-1 text-xs text-muted-foreground">¿Cuánto guardaste?</div>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent text-center text-3xl font-semibold outline-none"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-date">Fecha</Label>
          <Input id="c-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </form>
    </ResponsiveModal>
  )
}
