import { create } from 'zustand'

interface DebtModalState {
  isOpen: boolean
  open: () => void
  close: () => void
}

/** Modal global de alta de deuda/préstamo; lo abren el menú del '+' y el tablero de Deudas en Plan. */
export const useDebtModal = create<DebtModalState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
