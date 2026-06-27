import { create } from 'zustand'

export type DelegationRole = 'OWNER' | 'SUPERVISOR' | 'ASESOR'

export interface ActiveDelegation {
  ownerId: string
  ownerName: string
  role: DelegationRole // rol del usuario actual sobre esa cuenta
}

interface OwnerState {
  /** Id propio del usuario logueado (sub del JWT). */
  selfId: string | null
  /** Owner cuyos datos se están viendo (= selfId si no hay delegación activa). */
  activeOwnerId: string | null
  /** Delegación activa, o null cuando se opera la cuenta propia. */
  delegation: ActiveDelegation | null
  /** Si las acciones de escritura están bloqueadas (rol ASESOR en delegación). */
  isReadOnly: boolean

  resetToSelf: (selfId: string) => void
  viewDelegation: (d: ActiveDelegation) => void
  clear: () => void
}

export const useOwnerStore = create<OwnerState>((set) => ({
  selfId: null,
  activeOwnerId: null,
  delegation: null,
  isReadOnly: false,

  resetToSelf: (selfId) =>
    set({ selfId, activeOwnerId: selfId, delegation: null, isReadOnly: false }),

  viewDelegation: (d) =>
    set({ activeOwnerId: d.ownerId, delegation: d, isReadOnly: d.role === 'ASESOR' }),

  clear: () =>
    set({ selfId: null, activeOwnerId: null, delegation: null, isReadOnly: false }),
}))
