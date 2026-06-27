import { useMemo } from 'react'
import { parseDecimal } from '@/utils/formatCurrency'
import { useCategories, categoryMeta } from '@/features/categories'
import { useTransactions, type Transaction } from '@/features/transactions'
import type { DonutSlice, MonthBar } from '@/components/elements/charts'

const MONTH_FMT = new Intl.DateTimeFormat('es-AR', { month: 'short' })

/**
 * Resumen del owner activo calculado en cliente desde las transacciones.
 * ponytail: agregación en cliente, sin endpoint de resumen.
 */
export function useSummary() {
  const { data: txns } = useTransactions()
  const { data: categories } = useCategories()

  return useMemo(() => {
    const list = txns ?? []
    return {
      byCategory: expensesByCategory(list, categories ?? []),
      byMonth: lastMonths(list, 6),
      hasData: list.length > 0,
    }
  }, [txns, categories])
}

function expensesByCategory(
  txns: Transaction[],
  categories: import('@/features/categories').Category[],
): DonutSlice[] {
  const now = new Date()
  const totals = new Map<string, number>()
  for (const t of txns) {
    if (t.movementType !== 'EXPENSE') continue
    const d = new Date(t.date)
    if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) continue
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + parseDecimal(t.amount))
  }
  return [...totals.entries()]
    .map(([categoryId, value]) => {
      const cat = categories.find((c) => c.id === categoryId)
      return {
        name: cat?.name ?? 'Sin categoría',
        value,
        color: cat ? categoryMeta(cat).color : '#94A3B8',
      }
    })
    .sort((a, b) => b.value - a.value)
}

function lastMonths(txns: Transaction[], n: number): MonthBar[] {
  const now = new Date()
  const buckets: MonthBar[] = []
  const index = new Map<string, MonthBar>()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const bar: MonthBar = { month: MONTH_FMT.format(d), income: 0, expense: 0 }
    buckets.push(bar)
    index.set(`${d.getFullYear()}-${d.getMonth()}`, bar)
  }
  for (const t of txns) {
    const d = new Date(t.date)
    const bar = index.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (!bar) continue
    if (t.movementType === 'INCOME') bar.income += parseDecimal(t.amount)
    if (t.movementType === 'EXPENSE') bar.expense += parseDecimal(t.amount)
  }
  return buckets
}
