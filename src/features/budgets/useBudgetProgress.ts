import { useMemo } from 'react'
import { parseDecimal } from '@/utils/formatCurrency'
import { useCategories } from '@/features/categories'
import { useTransactions } from '@/features/transactions'
import { useBudgets, currentMonth } from './api/useBudgets'

export interface BudgetProgress {
  categoryId: string
  name: string
  limit: number
  spent: number
  pct: number
  over: boolean
}

/** Cruza presupuestos del mes con el gasto real (del mes actual) por categoría. */
export function useBudgetProgress(): BudgetProgress[] {
  const { data: budgets } = useBudgets()
  const { data: txns } = useTransactions()
  const { data: categories } = useCategories()

  return useMemo(() => {
    const month = currentMonth()
    const monthBudgets = (budgets ?? []).filter((b) => b.month === month)
    if (monthBudgets.length === 0) return []

    const now = new Date()
    const spentByCat = new Map<string, number>()
    for (const t of txns ?? []) {
      if (t.movementType !== 'EXPENSE') continue
      const d = new Date(t.date)
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) continue
      spentByCat.set(t.categoryId, (spentByCat.get(t.categoryId) ?? 0) + parseDecimal(t.amount))
    }

    return monthBudgets.map((b) => {
      const limit = parseDecimal(b.limit)
      const spent = spentByCat.get(b.categoryId) ?? 0
      const pct = limit > 0 ? (spent / limit) * 100 : 0
      return {
        categoryId: b.categoryId,
        name: categories?.find((c) => c.id === b.categoryId)?.name ?? 'Categoría',
        limit,
        spent,
        pct,
        over: spent > limit,
      }
    })
  }, [budgets, txns, categories])
}
