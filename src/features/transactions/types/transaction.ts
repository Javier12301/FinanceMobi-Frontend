import type { MovementType } from '@/features/categories'

/** ADJUSTMENT solo llega desde el servidor; nunca se ofrece en formularios manuales. */
export type TransactionMovementType = MovementType | 'ADJUSTMENT'

/**
 * POSTED = ya ocurrió y está aplicado al saldo.
 * PENDING = gasto futuro: fecha de un día posterior a hoy, todavía NO afecta el saldo.
 * El backend lo postea solo cuando llega su fecha.
 */
export type TransactionStatus = 'POSTED' | 'PENDING'

export interface Transaction {
  id: string
  walletId: string
  destinationWalletId: string | null
  categoryId: string | null // null en transferencias (no llevan categoría)
  amount: string // decimal como string
  description: string | null
  date: string // ISO 8601
  movementType: TransactionMovementType
  status: TransactionStatus
  /** Presente si la transacción provino de un pago de deuda (cuota). */
  debtId?: string | null
  /** Presente si la transacción la generó una regla recurrente (cobro automático). */
  recurringRuleId?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTransactionInput {
  /** id generado por el cliente (alta offline): el POST es idempotente ante reintentos del outbox. */
  id?: string
  walletId: string
  /** Opcional: las transferencias no llevan categoría. */
  categoryId?: string
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
  /** Corregir la billetera del movimiento; el backend reconcilia el saldo entre vieja y nueva. */
  walletId?: string
  /** Solo TRANSFER: corregir la billetera destino. */
  destinationWalletId?: string
}

export interface TransactionFilters {
  walletId?: string
  categoryId?: string
  debtId?: string
  dateFrom?: string
  dateTo?: string
  /** Sin este filtro el backend devuelve solo POSTED. `PENDING` = gastos futuros ("Próximos"). */
  status?: TransactionStatus
}
