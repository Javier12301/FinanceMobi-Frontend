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
        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
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
        <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => formatCurrency(Number(v))} cursor={{ fill: 'transparent' }} />
        <Bar dataKey="income" fill="var(--color-success, #10B981)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" fill="var(--color-destructive, #EF4444)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
