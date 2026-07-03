export interface WalletType {
  id: number // 1=CASH, 2=BANK_ACCOUNT, 3=CREDIT_CARD, 4=SAVINGS
  name: string
}

export interface Wallet {
  id: string
  ownerId: string
  typeId: number
  name: string
  description: string | null
  initialBalance: string // decimal como string
  currentBalance: string // decimal como string
  createdAt: string
  updatedAt: string
}

export interface CreateWalletInput {
  name: string
  typeId: number
  description?: string
  initialBalance: number
}

export interface UpdateWalletInput {
  name?: string
  typeId?: number
  description?: string
  /** Corregir saldo inicial: el backend ajusta el saldo actual por la misma diferencia. */
  initialBalance?: number
}
