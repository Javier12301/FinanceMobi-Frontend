import { cn } from '@/lib/utils'
import { formatCurrency, amountPrefix } from '@/utils/formatCurrency'

interface MoneyProps {
  amount: string | number
  /** Si se pasa, aplica color y signo según INCOME/EXPENSE/TRANSFER. */
  movementType?: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ADJUSTMENT'
  className?: string
}

const colorByType: Record<string, string> = {
  INCOME: 'text-success',
  EXPENSE: 'text-destructive',
  TRANSFER: 'text-muted-foreground',
  ADJUSTMENT: 'text-primary',
}

/** Renderiza un monto formateado, opcionalmente con color y signo del movimiento. */
export function Money({ amount, movementType, className }: MoneyProps) {
  const color = movementType ? colorByType[movementType] : ''
  const prefix = movementType ? amountPrefix(movementType) : ''
  return (
    <span className={cn('font-semibold tabular-nums whitespace-nowrap', color, className)}>
      {prefix ? `${prefix} ` : ''}
      {formatCurrency(amount)}
    </span>
  )
}
