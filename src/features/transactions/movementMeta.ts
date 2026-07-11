import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import type { TransactionMovementType } from './types/transaction'

interface MovementMeta {
  label: string
  icon: LucideIcon
}

const META: Record<TransactionMovementType, MovementMeta> = {
  INCOME: { label: 'Ingreso', icon: ArrowUpRight },
  EXPENSE: { label: 'Gasto', icon: ArrowDownLeft },
  TRANSFER: { label: 'Transferencia', icon: ArrowLeftRight },
  ADJUSTMENT: { label: 'Ajuste de saldo', icon: SlidersHorizontal },
}

export function movementMeta(type: TransactionMovementType): MovementMeta {
  return META[type]
}
