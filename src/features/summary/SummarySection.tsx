import { formatCurrency } from '@/utils/formatCurrency'
import { CategoryDonut, MonthlyBars } from '@/components/elements/charts'
import { useBudgetProgress } from '@/features/budgets'
import { useSummary, useInsights } from './useSummary'

/** Sección "¿En qué se me va?" del dashboard: donut por categoría + evolución mensual + presupuestos. */
export function SummarySection() {
  const { byCategory, byMonth, hasData } = useSummary()
  const budgets = useBudgetProgress()
  const { data: insights } = useInsights()

  if (!hasData) return null

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="¿En qué se me va? (este mes)">
        {byCategory.length > 0 ? (
          <>
            <CategoryDonut data={byCategory} />
            <ul className="mt-3 space-y-1.5">
              {byCategory.slice(0, 5).map((s) => (
                <li key={s.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                  <span className="font-medium">{formatCurrency(s.value)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin gastos este mes.</p>
        )}
      </Card>

      <Card title="Evolución mensual">
        {(insights?.expenses?.deltaPercent != null || insights?.income?.deltaPercent != null) && (
          <div className="mb-3 flex gap-3 text-xs">
            {insights?.expenses?.deltaPercent != null && (
              <span className={insights.expenses.deltaPercent > 0 ? 'text-destructive' : 'text-success'}>
                Gastos {insights.expenses.deltaPercent > 0 ? '▲' : '▼'}{' '}
                {Math.abs(insights.expenses.deltaPercent).toFixed(1)}% vs mes anterior
              </span>
            )}
            {insights?.income?.deltaPercent != null && (
              <span className={insights.income.deltaPercent >= 0 ? 'text-success' : 'text-destructive'}>
                Ingresos {insights.income.deltaPercent >= 0 ? '▲' : '▼'}{' '}
                {Math.abs(insights.income.deltaPercent).toFixed(1)}%
              </span>
            )}
          </div>
        )}
        <MonthlyBars data={byMonth} />
        {budgets.length > 0 && (
          <div className="mt-4 space-y-2.5">
            <div className="text-xs font-semibold text-muted-foreground">Presupuestos</div>
            {budgets.map((b) => (
              <div key={b.categoryId}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{b.name}</span>
                  <span className={b.over ? 'text-destructive' : 'text-muted-foreground'}>
                    {formatCurrency(b.spent)} / {formatCurrency(b.limit)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface">
                  <div
                    className={b.over ? 'h-full bg-destructive' : 'h-full bg-primary'}
                    style={{ width: `${Math.min(100, b.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {children}
    </div>
  )
}
