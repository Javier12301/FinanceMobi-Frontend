import { lazy, Suspense } from 'react'
import { Link } from '@tanstack/react-router'
import { Bell, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MetricCard } from '@/components/elements/MetricCard'
import { IconBadge } from '@/components/elements/IconBadge'
import { Money } from '@/components/elements/Money'
import { EmptyState } from '@/components/elements/EmptyState'
import { formatCurrency, parseDecimal } from '@/utils/formatCurrency'
import { useAuthStore } from '@/store/useAuthStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useWallets, useWalletTypes, useWalletModal, walletTypeMeta } from '@/features/wallets'
import {
  useTransactions,
  useTransactionDrawer,
  TransactionRow,
  type Transaction,
} from '@/features/transactions'
import { PendingRecurringCard } from '@/features/recurring'

// ponytail: lazy => recharts queda fuera del chunk crítico del dashboard.
const SummarySection = lazy(() =>
  import('@/features/summary').then((m) => ({ default: m.SummarySection })),
)

function monthTotals(txns: Transaction[]) {
  const now = new Date()
  let income = 0
  let expense = 0
  for (const t of txns) {
    const d = new Date(t.date)
    if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) continue
    if (t.movementType === 'INCOME') income += parseDecimal(t.amount)
    if (t.movementType === 'EXPENSE') expense += parseDecimal(t.amount)
  }
  return { income, expense }
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const delegation = useOwnerStore((s) => s.delegation)
  const resetToSelf = useOwnerStore((s) => s.resetToSelf)
  const selfId = useOwnerStore((s) => s.selfId)

  const { data: wallets, isLoading: walletsLoading } = useWallets()
  const { data: types } = useWalletTypes()
  const { data: txns, isLoading: txnsLoading } = useTransactions()
  const openWalletModal = useWalletModal((s) => s.open)
  const openDrawer = useTransactionDrawer((s) => s.open)

  const totalBalance = wallets?.reduce((sum, w) => sum + parseDecimal(w.currentBalance), 0) ?? 0
  const { income, expense } = monthTotals(txns ?? [])
  const recent = (txns ?? []).slice(0, 5)
  const typeName = (id: number) => types?.find((t) => t.id === id)?.name

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Hola, <span className="font-bold">{user?.name ?? user?.email?.split('@')[0] ?? 'Usuario'}</span>
          </h1>
          {delegation && (
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-medium text-primary">
                Viendo: {delegation.ownerName}
              </span>
              <button
                onClick={() => selfId && resetToSelf(selfId)}
                className="text-[11px] text-muted-foreground underline"
              >
                Volver a mi cuenta
              </button>
            </div>
          )}
        </div>
        <Bell size={20} className="text-muted-foreground" />
      </div>

      {/* Recurrentes vencidos por confirmar (oculto si no hay / endpoint dormido) */}
      <PendingRecurringCard />

      {/* Métricas */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Balance total" value={formatCurrency(totalBalance)} hint="Suma de todas las billeteras" />
        <MetricCard label="Ingresos del mes" value={formatCurrency(income)} valueClassName="text-success" />
        <MetricCard label="Gastos del mes" value={formatCurrency(expense)} valueClassName="text-destructive" />
      </div>

      {/* Resumen: gráficos por categoría + evolución + presupuestos */}
      <div className="mb-5">
        <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
          <SummarySection />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[60fr_40fr]">
        {/* Últimas transacciones */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3.5">
            <span className="text-sm font-semibold">Últimas transacciones</span>
            <Link to="/transactions" className="text-xs font-medium text-primary">
              Ver todas →
            </Link>
          </div>
          <div className="px-3">
            {txnsLoading ? (
              <div className="space-y-2 py-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : recent.length > 0 ? (
              recent.map((t) => (
                <TransactionRow
                  key={t.id}
                  tx={t}
                  walletName={wallets?.find((w) => w.id === t.walletId)?.name}
                  onClick={openDrawer}
                />
              ))
            ) : (
              <p className="px-1 py-8 text-center text-sm text-muted-foreground">Sin movimientos aún.</p>
            )}
          </div>
        </div>

        {/* Mis billeteras */}
        <div className="flex flex-col rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3.5">
            <span className="text-sm font-semibold">Mis billeteras</span>
            <Link to="/wallets" className="text-xs font-medium text-primary">
              Ver todas →
            </Link>
          </div>
          <div className="flex-1">
            {walletsLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : wallets && wallets.length > 0 ? (
              wallets.map((w) => {
                const meta = walletTypeMeta(typeName(w.typeId))
                return (
                  <div key={w.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
                    <IconBadge icon={meta.icon} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{w.name}</div>
                      <div className="text-xs text-muted-foreground">{meta.label}</div>
                    </div>
                    <Money amount={w.currentBalance} className="text-sm" />
                  </div>
                )
              })
            ) : (
              <EmptyState icon={Plus} title="Sin billeteras" />
            )}
          </div>
          <div className="p-3">
            <Button variant="outline" className="w-full border-dashed text-muted-foreground" onClick={() => openWalletModal()}>
              <Plus size={16} /> Nueva billetera
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
