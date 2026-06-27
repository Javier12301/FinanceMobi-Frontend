import { create } from 'zustand'
import type { Transaction } from './types/transaction'

interface TransactionModalState {
  isOpen: boolean
  editing: Transaction | null
  open: (editing?: Transaction) => void
  close: () => void
}

/** Controla el modal de registro/edición; lo abre el FAB y los botones "Registrar"/"Editar". */
export const useTransactionModal = create<TransactionModalState>((set) => ({
  isOpen: false,
  editing: null,
  open: (editing) => set({ isOpen: true, editing: editing ?? null }),
  close: () => set({ isOpen: false, editing: null }),
}))
