export type DelegationRole = 'SUPERVISOR' | 'ASESOR'

export interface DelegationUser {
  id: string
  name: string
  email: string
}

export interface Delegation {
  id: string
  role: DelegationRole
  /** En "granted" = el delegado; en "managing" = el dueño de la cuenta. */
  user: DelegationUser
}

/**
 * Forma tentativa de GET /api/delegations (no está en el contrato v1).
 * - granted: personas con acceso a MI cuenta.
 * - managing: cuentas de otros que YO gestiono.
 */
export interface DelegationsResponse {
  granted: Delegation[]
  managing: Delegation[]
}

export interface InviteDelegationInput {
  email: string
  role: DelegationRole
}
