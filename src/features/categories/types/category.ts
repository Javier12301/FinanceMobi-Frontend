export type MovementType = 'INCOME' | 'EXPENSE' | 'TRANSFER'

export interface Category {
  id: string
  ownerId: string
  movementType: MovementType
  name: string
  /** Ícono lucide (clave). Opcional: el backend aún no lo expone (v3). */
  icon?: string | null
  /** Color hex/token. Opcional: el backend aún no lo expone (v3). */
  color?: string | null
  createdAt: string
}

export interface CreateCategoryInput {
  name: string
  movementType: MovementType
  icon?: string
  color?: string
}

export interface UpdateCategoryInput {
  name?: string
  icon?: string
  color?: string
}
