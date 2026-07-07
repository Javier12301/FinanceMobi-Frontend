import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Bell, AlertTriangle, Repeat, HardDrive, PiggyBank, ChevronRight, type LucideIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { parseDecimal, formatCurrency } from '@/utils/formatCurrency'
import { useAuthStore } from '@/store/useAuthStore'
import { useDebts, useDebtModal } from '@/features/debts'
import { useBudgets } from '@/features/budgets'
import { useCategories } from '@/features/categories'
import { useTransactions } from '@/features/transactions'
import { usePendingRecurring } from '@/features/recurring'

interface NotifItem {
  id: string
  icon: LucideIcon
  title: string
  subtitle: string
  tone?: 'destructive' | 'primary'
  onClick?: () => void
}

const monthKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Campanita del Inicio: abre un panel con notificaciones DERIVADAS de datos existentes
 * (deuda vencida, presupuestos al límite, recurrentes pendientes, Drive desconectado).
 * Sin feed persistente ni estado leído/no leído.
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const driveConnected = useAuthStore((s) => s.user?.driveConnected)
  const { data: debts } = useDebts()
  const { data: budgets } = useBudgets()
  const { data: categories } = useCategories()
  const { data: txns } = useTransactions()
  const { data: pending } = usePendingRecurring()
  const openDebtView = useDebtModal((s) => s.openView)

  const items = useMemo<NotifItem[]>(() => {
    const out: NotifItem[] = []
    const startToday = new Date()
    startToday.setHours(0, 0, 0, 0)

    // 1) Deudas con cuota vencida
    for (const d of debts ?? []) {
      if (d.status === 'ACTIVE' && d.dueDate && new Date(d.dueDate) < startToday) {
        out.push({
          id: `debt-${d.id}`,
          icon: AlertTriangle,
          title: `Cuota vencida — ${d.counterparty}`,
          subtitle: `Venció el ${new Date(d.dueDate).toLocaleDateString('es-AR')}`,
          tone: 'destructive',
          onClick: () => {
            openDebtView(d)
            setOpen(false)
          },
        })
      }
    }

    // 2) Presupuestos al 80% / superados (gasto del mes por categoría)
    const month = monthKey()
    const spentByCat: Record<string, number> = {}
    for (const t of txns ?? []) {
      if (t.movementType !== 'EXPENSE') continue
      if (!t.date.startsWith(month)) continue
      spentByCat[t.categoryId] = (spentByCat[t.categoryId] ?? 0) + parseDecimal(t.amount)
    }
    for (const b of budgets ?? []) {
      if (b.month !== month) continue
      const limit = parseDecimal(b.limit)
      if (limit <= 0) continue
      const spent = spentByCat[b.categoryId] ?? 0
      const pct = spent / limit
      if (pct < 0.8) continue
      const catName = categories?.find((c) => c.id === b.categoryId)?.name ?? 'Presupuesto'
      out.push({
        id: `budget-${b.id}`,
        icon: PiggyBank,
        title: pct >= 1 ? `Superaste el presupuesto de ${catName}` : `Presupuesto de ${catName} al ${Math.round(pct * 100)}%`,
        subtitle: `${formatCurrency(spent)} de ${formatCurrency(limit)}`,
        tone: pct >= 1 ? 'destructive' : undefined,
        onClick: () => {
          navigate({ to: '/plan' })
          setOpen(false)
        },
      })
    }

    // 3) Movimientos fijos pendientes de confirmar
    for (const r of pending ?? []) {
      out.push({
        id: `pending-${r.id}`,
        icon: Repeat,
        title: 'Movimiento fijo pendiente',
        subtitle: `${r.description || 'Recurrente'} · ${formatCurrency(r.amount)}`,
        tone: 'primary',
        onClick: () => {
          navigate({ to: '/plan' })
          setOpen(false)
        },
      })
    }

    // 4) Google Drive desconectado
    if (driveConnected === false) {
      out.push({
        id: 'drive',
        icon: HardDrive,
        title: 'Conectá Google Drive',
        subtitle: 'Guardá los comprobantes en tu propia cuenta',
        onClick: () => {
          navigate({ to: '/settings' })
          setOpen(false)
        },
      })
    }

    return out
  }, [debts, budgets, categories, txns, pending, driveConnected, openDebtView, navigate])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Notificaciones"
      >
        <Bell size={20} />
        {items.length > 0 && (
          <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
            {items.length}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-2xl px-4 pt-5 pb-[calc(1.25rem_+_var(--safe-area-inset-bottom))]">
          <SheetTitle className="mb-1 text-lg">Notificaciones</SheetTitle>
          <p className="mb-4 text-sm text-muted-foreground">Lo que necesita tu atención</p>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Bell size={22} />
              </span>
              <p className="text-sm font-medium">Estás al día</p>
              <p className="text-xs text-muted-foreground">No tenés notificaciones pendientes.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={it.onClick}
                    disabled={!it.onClick}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors enabled:hover:bg-muted"
                  >
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full',
                        it.tone === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-primary-soft text-primary',
                      )}
                    >
                      <it.icon size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{it.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{it.subtitle}</div>
                    </div>
                    {it.onClick && <ChevronRight size={16} className="shrink-0 text-muted-foreground" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
