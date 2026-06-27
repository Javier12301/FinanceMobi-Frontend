import { create } from 'zustand'
import type { Wallet } from './types/wallet'

interface WalletModalState {
  isOpen: boolean
  editing: Wallet | null
  /** Abre el modal; sin argumento = crear, con wallet = editar. */
  open: (wallet?: Wallet) => void
  close: () => void
}

export const useWalletModal = create<WalletModalState>((set) => ({
  isOpen: false,
  editing: null,
  open: (wallet) => set({ isOpen: true, editing: wallet ?? null }),
  close: () => set({ isOpen: false, editing: null }),
}))
