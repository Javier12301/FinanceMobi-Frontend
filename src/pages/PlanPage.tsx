import { Plus, CalendarClock, Landmark, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Money } from '@/components/elements/Money'
import { IconBadge } from '@/components/elements/IconBadge'
import { MetricCard } from '@/components/elements/MetricCard'
import { formatCurrency, parseDecimal } from '@/utils/formatCurrency'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useCategories } from '@/features/categories'
import { useRecurringRules } from '@/features/recurring'
import { useTransactionModal } from '@/features/transactions'
import { useDebts, useDeleteDebt, useDebtModal, type Debt } from '@/features/debts'
import { toast } from 'sonner'
import { errorMessage } from '@/config/api'
import { Trash2 } from 'lucide-react'

/**
 * Plan mensual: una sola vista con los ingresos fijos (sueldos, fijo o promedio),
 * los gastos fijos y las deudas/préstamos del owner activo. Respeta delegación (isReadOnly).
 */
export function PlanPage() {
  const isReadOnly = useOwnerStore((s) => s.isReadOnly)
  const { data: rules } = useRecurringRules()
  const { data: debts } = useDebts()
  const { data: categories } = useCategories()
  const openNewTxn = useTransactionModal((s) => s.openNew)
  const openDebtModal = useDebtModal((s) => s.open)
  const delDebt = useDeleteDebt()

  const activeRules = (rules ?? []).filter((r) => r.active)
  const incomeRules = activeRules.filter((r) => r.movementType === 'INCOME')
  const expenseRules = activeRules.filter((r) => r.movementType === 'EXPENSE')
  const activeDebts = (debts ?? []).filter((d) => d.status === 'ACTIVE')
  const iOwe = activeDebts.filter((d) => d.direction === 'I_OWE')
  const owedToMe = activeDebts.filter((d) => d.direction === 'OWED_TO_ME')

  const sum = (arr: { amount?: string; remaining?: string }[], key: 'amount' | 'remaining') =>
    arr.reduce((s, x) => s + parseDecimal(x[key]), 0)

  const expectedIncome = sum(incomeRules, 'amount')
  const fixedExpense = sum(expenseRules, 'amount')
  const totalIOwe = sum(iOwe, 'remaining')

  const catName = (id: string | null) => categories?.find((c) => c.id === id)?.name

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Plan mensual</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Tus ingresos fijos, gastos fijos y deudas en un solo lugar.
        </p>
      </div>

      {/* Resumen */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Ingresos fijos / mes" value={formatCurrency(expectedIncome)} valueClassName="text-success" />
        <MetricCard label="Gastos fijos / mes" value={formatCurrency(fixedExpense)} valueClassName="text-destructive" />
        <MetricCard label="Deudas activas" value={formatCurrency(totalIOwe)} hint={`${iOwe.length} sin saldar`} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Ingresos fijos */}
        <Section
          title="Ingresos fijos"
          icon={ArrowDownLeft}
          isEmpty={incomeRules.length === 0}
          empty="Sin ingresos fijos. Cargá un sueldo y activá «Repetir cada mes»."
          action={!isReadOnly ? {
            label: 'Agregar ingreso fijo',
            onClick: () => openNewTxn({ movementType: 'INCOME', repeat: true })
          } : undefined}
        >
          {incomeRules.map((r) => (
            <RuleRow key={r.id} title={r.description || catName(r.categoryId) || 'Ingreso'}
              amount={r.amount} movementType="INCOME" day={r.dayOfMonth}
              tag={r.autoPost ? 'fijo' : 'promedio'} />
          ))}
        </Section>

        {/* Gastos fijos */}
        <Section
          title="Gastos fijos"
          icon={ArrowUpRight}
          isEmpty={expenseRules.length === 0}
          empty="Sin gastos fijos. Cargá uno y activá «Repetir cada mes»."
          action={!isReadOnly ? {
            label: 'Agregar gasto fijo',
            onClick: () => openNewTxn({ movementType: 'EXPENSE', repeat: true })
          } : undefined}
        >
          {expenseRules.map((r) => (
            <RuleRow key={r.id} title={r.description || catName(r.categoryId) || 'Gasto'}
              amount={r.amount} movementType="EXPENSE" day={r.dayOfMonth}
              tag={r.autoPost ? 'automático' : undefined} />
          ))}
        </Section>

        {/* Deudas y préstamos */}
        <div className="lg:col-span-2">
          <Section
            title="Deudas y préstamos"
            icon={Landmark}
            isEmpty={activeDebts.length === 0}
            empty="Sin deudas ni préstamos. Agregá uno con el botón «＋»."
            action={!isReadOnly ? {
              label: 'Agregar deuda o préstamo',
              onClick: openDebtModal
            } : undefined}
          >
            {iOwe.length > 0 && <GroupLabel>Debo</GroupLabel>}
            {iOwe.map((d) => (
              <DebtRow key={d.id} debt={d} category={catName(d.categoryId)}
                onDelete={isReadOnly ? undefined : () => onDeleteDebt(d.id, delDebt)} />
            ))}
            {owedToMe.length > 0 && <GroupLabel>Me deben</GroupLabel>}
            {owedToMe.map((d) => (
              <DebtRow key={d.id} debt={d} category={catName(d.categoryId)}
                onDelete={isReadOnly ? undefined : () => onDeleteDebt(d.id, delDebt)} />
            ))}
          </Section>
        </div>
      </div>
    </div>
  )
}

function onDeleteDebt(id: string, del: ReturnType<typeof useDeleteDebt>) {
  del.mutate(id, {
    onSuccess: () => toast.success('Eliminado'),
    onError: (err) => toast.error(errorMessage(err)),
  })
}

// ponytail: Section ahora acepta action opcional para botón de agregar
function Section({
  title, icon: Icon, empty, isEmpty, children, action,
}: {
  title: string
  icon: typeof Landmark
  empty: string
  isEmpty: boolean
  children: React.ReactNode
  action?: { label: string; onClick: () => void }
}) {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3.5">
        <div className="flex items-center gap-2">
          <IconBadge icon={Icon} size="sm" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={action.label}
            title={action.label}
          >
            <Plus size={18} />
          </button>
        )}
      </div>
      <div className="px-2 py-1.5">
        {isEmpty ? <p className="px-2 py-6 text-center text-sm text-muted-foreground">{empty}</p> : children}
      </div>
    </section>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  )
}

function RuleRow({
  title, amount, movementType, day, tag,
}: {
  title: string
  amount: string
  movementType: 'INCOME' | 'EXPENSE'
  day: number
  tag?: string
}) {
  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-2.5 hover:bg-accent/40">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock size={12} /> día {day}
          {tag && <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-medium">{tag}</span>}
        </div>
      </div>
      <Money amount={amount} movementType={movementType} className="text-sm" />
    </div>
  )
}

function DebtRow({
  debt, category, onDelete,
}: {
  debt: Debt
  category?: string
  onDelete?: () => void
}) {
  const owed = debt.direction === 'OWED_TO_ME'
  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-2.5 hover:bg-accent/40">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{debt.counterparty}</div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {category && <span>{category}</span>}
          {debt.installmentsTotal != null && (
            <span>· cuota {(debt.installmentsPaid ?? 0) + 1} de {debt.installmentsTotal}</span>
          )}
          {debt.dueDate && <span>· vence {new Date(debt.dueDate).toLocaleDateString('es-AR')}</span>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className={owed ? 'text-sm font-semibold tabular-nums text-success' : 'text-sm font-semibold tabular-nums text-destructive'}>
            {formatCurrency(debt.remaining)}
          </span>
          <div className="text-[10px] text-muted-foreground">de {formatCurrency(debt.principal)}</div>
        </div>
        {onDelete && (
          <button onClick={onDelete} className="text-destructive" aria-label="Eliminar">
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  )
}
