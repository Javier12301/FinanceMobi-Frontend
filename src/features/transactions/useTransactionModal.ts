import { create } from 'zustand'
import type { Transaction } from './types/transaction'

interface TransactionModalState {
  isOpen: boolean
  editing: Transaction | null
  /** Movimiento base para "Repetir": precarga datos pero crea uno nuevo (sin id). */
  duplicateFrom: Transaction | null
  open: (editing?: Transaction) => void
  openDuplicate: (source: Transaction) => void
  close: () => void
}

/** Controla el modal de registro/edición; lo abre el FAB y los botones "Registrar"/"Editar"/"Repetir". */
export const useTransactionModal = create<TransactionModalState>((set) => ({
  isOpen: false,
  editing: null,
  duplicateFrom: null,
  open: (editing) => set({ isOpen: true, editing: editing ?? null, duplicateFrom: null }),
  openDuplicate: (source) => set({ isOpen: true, editing: null, duplicateFrom: source }),
  close: () => set({ isOpen: false, editing: null, duplicateFrom: null }),
}))
