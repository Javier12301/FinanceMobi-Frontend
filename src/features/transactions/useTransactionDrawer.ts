import { create } from 'zustand'
import type { Transaction } from './types/transaction'

interface TransactionDrawerState {
  tx: Transaction | null
  open: (tx: Transaction) => void
  close: () => void
}

/** Controla el drawer de detalle de transacción (se abre al tocar una fila). */
export const useTransactionDrawer = create<TransactionDrawerState>((set) => ({
  tx: null,
  open: (tx) => set({ tx }),
  close: () => set({ tx: null }),
}))
