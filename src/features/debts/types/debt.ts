/**
 * Deuda / préstamo (V4). Modela tanto lo que el owner DEBE (préstamo de banco, "le debo a Juan")
 * como lo que le DEBEN / prestó (cobros pendientes). Las cuotas se materializan vía una RecurringRule.
 * Ver contrato esperado en docs/para-backend/frontend-pendientes-v4.md §"Deudas y préstamos".
 */
export type DebtDirection = 'I_OWE' | 'OWED_TO_ME'
export type DebtStatus = 'ACTIVE' | 'PAID'

export interface Debt {
  id: string
  ownerId: string
  direction: DebtDirection
  /** Contraparte: banco, persona, etc. */
  counterparty: string
  /** Categoría opcional para agrupar (ej. "Préstamo banco", "Gastos fijos"). */
  categoryId: string | null
  /** Monto original, decimal-string. */
  principal: string
  /** Saldo pendiente de capital, decimal-string. Baja solo por la cuota pactada, no por recargos. */
  remaining: string
  /** Recargos/intereses pagados por encima de lo pactado, decimal-string. Costo extra, no capital. */
  interestPaid: string
  /** Regla de recurrencia que dispara las cuotas (si tiene plan de cuotas). */
  recurringRuleId: string | null
  /** Cantidad total de cuotas (para "Cuota N de M"); null si es pago único. */
  installmentsTotal: number | null
  installmentsPaid: number
  /** Vencimiento, ISO; para pago único o próxima cuota. */
  dueDate: string | null
  status: DebtStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateDebtInput {
  direction: DebtDirection
  counterparty: string
  principal: number
  categoryId?: string | null
  installmentsTotal?: number | null
  dueDate?: string | null
  /** Billetera desde la que se descuenta cada cuota. Requerido si hay installmentsTotal. */
  walletId?: string | null
  notes?: string | null
}

export interface UpdateDebtInput {
  counterparty?: string
  categoryId?: string | null
  dueDate?: string | null
  notes?: string | null
  status?: DebtStatus
}
