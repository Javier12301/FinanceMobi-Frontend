import type { MovementType } from '@/features/categories'

export type Frequency = 'MONTHLY' | 'WEEKLY' | 'YEARLY'

/** Regla de recurrencia (ver roadmap §2.2). MVP del front: frecuencia MONTHLY. */
export interface RecurringRule {
  id: string
  ownerId: string
  walletId: string
  destinationWalletId: string | null
  categoryId: string
  movementType: MovementType
  amount: string // decimal-string
  description: string | null
  dayOfMonth: number // 1..31
  frequency: Frequency
  autoPost: boolean // true = inserta sin preguntar
  startDate: string // ISO
  endDate: string | null // para cuotas/préstamos
  nextRunDate: string // ISO — próximo vencimiento
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateRecurringRuleInput {
  walletId: string
  categoryId: string
  movementType: MovementType
  amount: number
  description?: string
  dayOfMonth: number
  frequency?: Frequency // default MONTHLY
  autoPost: boolean
  destinationWalletId?: string
  startDate?: string
  endDate?: string
}

export interface UpdateRecurringRuleInput {
  amount?: number
  dayOfMonth?: number
  autoPost?: boolean
  active?: boolean // pausar/reanudar
  endDate?: string | null
}
