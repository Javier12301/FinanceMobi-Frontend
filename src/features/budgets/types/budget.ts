export interface Budget {
  id: string
  ownerId: string
  categoryId: string
  /** Mes "YYYY-MM" al que aplica el límite. */
  month: string
  /** Límite como decimal-string (igual que el resto de montos del backend). */
  limit: string
  createdAt: string
  updatedAt: string
}

export interface CreateBudgetInput {
  categoryId: string
  month: string
  limit: number
}

export interface UpdateBudgetInput {
  limit: number
}
