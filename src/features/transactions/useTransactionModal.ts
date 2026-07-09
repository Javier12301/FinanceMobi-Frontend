import { create } from 'zustand'
import type { MovementType } from '@/features/categories'
import type { Transaction } from './types/transaction'

/** Precarga opcional al abrir en modo alta (ej. desde Plan o el menú del '+'). */
export interface TxnDefaults {
  movementType?: MovementType
  repeat?: boolean
}

interface TransactionModalState {
  isOpen: boolean
  editing: Transaction | null
  /** Movimiento base para "Repetir": precarga datos pero crea uno nuevo (sin id). */
  duplicateFrom: Transaction | null
  /** Defaults de alta (tipo, repetir) cuando se abre desde un contexto específico. */
  defaults: TxnDefaults | null
  open: (editing?: Transaction) => void
  /** Alta nueva con precarga de tipo/repetir (ej. "Nuevo fijo" de Gastos fijos). */
  openNew: (defaults?: TxnDefaults) => void
  openDuplicate: (source: Transaction) => void
  close: () => void
}

/** Controla el modal de registro/edición; lo abre el '+', los tableros de Plan y "Editar"/"Repetir". */
export const useTransactionModal = create<TransactionModalState>((set) => ({
  isOpen: false,
  editing: null,
  duplicateFrom: null,
  defaults: null,
  open: (editing) => set({ isOpen: true, editing: editing ?? null, duplicateFrom: null, defaults: null }),
  openNew: (defaults) => set({ isOpen: true, editing: null, duplicateFrom: null, defaults: defaults ?? null }),
  openDuplicate: (source) => set({ isOpen: true, editing: null, duplicateFrom: source, defaults: null }),
  close: () => set({ isOpen: false, editing: null, duplicateFrom: null, defaults: null }),
}))
