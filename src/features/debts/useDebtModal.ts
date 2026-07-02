import { create } from 'zustand'
import type { Debt } from './types/debt'

type DebtModalMode = 'create' | 'view'

interface DebtModalState {
  isOpen: boolean
  mode: DebtModalMode
  /** Deuda que se está viendo/gestionando (solo en mode 'view'). */
  viewing: Debt | null
  /** Abre el alta de deuda. */
  open: () => void
  /** Abre el detalle/seguimiento de una deuda existente. */
  openView: (debt: Debt) => void
  close: () => void
}

/**
 * Modal global de deuda/préstamo. `open` abre el alta (menú '+' y tablero de Deudas);
 * `openView` abre el detalle con seguimiento de cuotas (fila de deuda en Plan).
 */
export const useDebtModal = create<DebtModalState>((set) => ({
  isOpen: false,
  mode: 'create',
  viewing: null,
  open: () => set({ isOpen: true, mode: 'create', viewing: null }),
  openView: (debt) => set({ isOpen: true, mode: 'view', viewing: debt }),
  close: () => set({ isOpen: false }),
}))
