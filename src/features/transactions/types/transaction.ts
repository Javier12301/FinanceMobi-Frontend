import type { MovementType } from '@/features/categories'

export interface Transaction {
  id: string
  walletId: string
  destinationWalletId: string | null
  categoryId: string
  amount: string // decimal como string
  description: string | null
  date: string // ISO 8601
  movementType: MovementType
  /** Presente si la transacción provino de un pago de deuda (cuota). */
  debtId?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTransactionInput {
  walletId: string
  categoryId: string
  amount: number
  movementType: MovementType
  date: string // ISO 8601
  description?: string
  destinationWalletId?: string // requerido solo si TRANSFER
}

export interface UpdateTransactionInput {
  categoryId?: string
  amount?: number
  description?: string
  date?: string
}

export interface TransactionFilters {
  walletId?: string
  categoryId?: string
  dateFrom?: string
  dateTo?: string
}
