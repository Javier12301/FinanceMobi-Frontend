import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string
  hint?: string
  valueClassName?: string
}

/** Tarjeta de métrica del dashboard (Balance total, Ingresos, Gastos). */
export function MetricCard({ label, value, hint, valueClassName }: MetricCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn('mt-2 text-2xl font-semibold tracking-tight', valueClassName)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
