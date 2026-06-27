export type MovementType = 'INCOME' | 'EXPENSE' | 'TRANSFER'

export interface Category {
  id: string
  ownerId: string
  movementType: MovementType
  name: string
  createdAt: string
}

export interface CreateCategoryInput {
  name: string
  movementType: MovementType
}
