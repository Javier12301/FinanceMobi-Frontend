/** Un aporte anotado por el usuario: "guardé $X para esta meta". No mueve plata real. */
export interface SavingsContribution {
  id: string
  goalId: string
  amount: string // decimal como string
  date: string // ISO 8601
  createdAt: string
}

/**
 * Meta de ahorro tipo "sobre": es un TRACKER. No toca billeteras ni el ledger.
 * `saved` = suma de los aportes (la calcula el backend).
 */
export interface SavingsGoal {
  id: string
  ownerId: string
  name: string
  targetAmount: string // decimal como string
  targetDate: string | null // ISO 8601
  saved: string // decimal como string
  contributions: SavingsContribution[]
  createdAt: string
  updatedAt: string
}

export interface CreateGoalInput {
  /** id del cliente (alta offline): el POST es idempotente ante reintentos del outbox. */
  id?: string
  name: string
  targetAmount: number
  targetDate?: string
}

export interface UpdateGoalInput {
  name?: string
  targetAmount?: number
  /** null saca la fecha objetivo. */
  targetDate?: string | null
}

export interface CreateContributionInput {
  id?: string
  amount: number
  date: string
}
