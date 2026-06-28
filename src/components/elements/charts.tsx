import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { formatCurrency } from '@/utils/formatCurrency'

// ponytail: wrappers mínimos sobre recharts, sin abstracción de "chart engine".

export interface DonutSlice {
  name: string
  value: number
  color: string
}

// ── Tooltip semántico ──────────────────────────────────────────────────────
// Recharts inyecta estilos inline en su tooltip por defecto (fondo blanco,
// borde gris hardcodeado). Para evitarlo, le pasamos un componente `content`
// propio que usa clases de Tailwind mapeadas a los tokens del design system.
interface TooltipPayloadEntry {
  name: string
  value: number
  color?: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      {label && (
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm text-card-foreground">
            {entry.color && (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
            )}
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold">{formatCurrency(Number(entry.value))}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Donut de gasto por categoría. */
export function CategoryDonut({ data }: { data: DonutSlice[] }) {
  if (data.length === 0) return null
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} stroke="none" />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export interface MonthBar {
  month: string
  income: number
  expense: number
}

/** Barras de ingresos vs gastos por mes. */
export function MonthlyBars({ data }: { data: MonthBar[] }) {
  if (data.length === 0) return null
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        {/* fill apunta a la variable CSS para que los labels lean bien en ambos modos */}
        <XAxis
          dataKey="month"
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'transparent' }} />
        {/* name en español para que el tooltip lo muestre correctamente */}
        <Bar dataKey="income" name="Ingresos" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Gastos" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
