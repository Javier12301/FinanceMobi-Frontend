import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import type { MovementType } from '@/features/categories'

interface MovementMeta {
  label: string
  icon: LucideIcon
}

const META: Record<MovementType, MovementMeta> = {
  INCOME: { label: 'Ingreso', icon: ArrowUpRight },
  EXPENSE: { label: 'Gasto', icon: ArrowDownLeft },
  TRANSFER: { label: 'Transferencia', icon: ArrowLeftRight },
}

export function movementMeta(type: MovementType): MovementMeta {
  return META[type]
}
