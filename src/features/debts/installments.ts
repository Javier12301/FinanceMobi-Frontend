import { parseDecimal } from '@/utils/formatCurrency'
import type { Debt } from './types/debt'

export type InstallmentStatus = 'paid' | 'next' | 'pending'

export interface Installment {
  /** Número de cuota, 1-indexado. */
  n: number
  /** Monto de la cuota (principal / total). */
  amount: number
  status: InstallmentStatus
  /** Vencimiento derivado (ISO), solo si la deuda tiene dueDate de referencia. */
  dueDate?: string
}

/**
 * Deriva la lista de cuotas desde los campos que ya expone el backend
 * (`installmentsTotal`, `installmentsPaid`, `principal`, `dueDate`).
 * ponytail: derivación pura, sin modelo `DebtInstallment`. Si algún día se necesita
 * estado por cuota real (pagos parciales, mora), ahí sí una tabla — no antes.
 *
 * Fechas: `dueDate` del backend es la próxima cuota impaga (installmentsPaid+1); el resto
 * se estima con offset mensual desde ahí. Estimación, no autoritativa.
 */
export function deriveInstallments(debt: Debt): Installment[] {
  const total = debt.installmentsTotal
  if (!total || total <= 0) return []

  const paid = Math.min(debt.installmentsPaid ?? 0, total)
  // Pactado (referencia para las pagadas) vs proyectado forward (lo que realmente queda por cuota).
  const nominal = parseDecimal(debt.principal) / total
  const projected = projectedInstallmentAmount(debt)
  const nextIdx = paid + 1 // número de la próxima cuota impaga (puede ser > total si está saldada)

  const baseDate = debt.dueDate ? new Date(debt.dueDate) : null

  return Array.from({ length: total }, (_, i) => {
    const n = i + 1
    const status: InstallmentStatus = n <= paid ? 'paid' : n === nextIdx ? 'next' : 'pending'
    let dueDate: string | undefined
    if (baseDate && !Number.isNaN(baseDate.getTime())) {
      const d = new Date(baseDate)
      d.setMonth(d.getMonth() + (n - nextIdx))
      dueDate = d.toISOString()
    }
    // Las pagadas muestran el pactado (no guardamos el monto real por cuota); las impagas, el forward.
    return { n, amount: status === 'paid' ? nominal : projected, status, dueDate }
  })
}

/**
 * Monto proyectado de la próxima cuota = saldo capital / cuotas restantes.
 * Se auto-corrige tras pagos parciales o adelantados. Sin plan de cuotas → saldo entero.
 */
export function projectedInstallmentAmount(debt: Debt): number {
  const total = debt.installmentsTotal
  const remaining = parseDecimal(debt.remaining)
  if (!total || total <= 0) return remaining
  const restantes = Math.max(1, total - Math.min(debt.installmentsPaid ?? 0, total))
  return remaining / restantes
}

/** Progreso 0..1 de cuotas pagadas. 0 si no hay plan de cuotas. */
export function installmentProgress(debt: Debt): number {
  const total = debt.installmentsTotal
  if (!total || total <= 0) return 0
  return Math.min(debt.installmentsPaid ?? 0, total) / total
}

// ── self-check ──────────────────────────────────────────────────────────────
// ponytail: check mínimo runnable (node --import tsx installments.ts o vía demo()).
export function demo() {
  const base = (over: Partial<Debt>): Debt => ({
    id: 'x', ownerId: 'o', direction: 'I_OWE', counterparty: 'Banco', categoryId: null,
    principal: '12000', remaining: '12000', interestPaid: '0', recurringRuleId: null, installmentsTotal: 12,
    installmentsPaid: 0, dueDate: null, status: 'ACTIVE', notes: null,
    createdAt: '', updatedAt: '', ...over,
  })

  const zero = deriveInstallments(base({ installmentsPaid: 0 }))
  console.assert(zero.length === 12, 'debe derivar 12 cuotas')
  console.assert(zero[0].status === 'next', 'cuota 1 es la próxima cuando 0 pagadas')
  console.assert(zero[1].status === 'pending', 'cuota 2 pendiente')
  console.assert(Math.abs(zero[0].amount - 1000) < 1e-9, 'cuota = 12000/12 = 1000')

  const mid = deriveInstallments(base({ installmentsPaid: 5 }))
  console.assert(mid[4].status === 'paid', 'cuota 5 pagada con 5 pagadas')
  console.assert(mid[5].status === 'next', 'cuota 6 es la próxima')
  console.assert(Math.abs(installmentProgress(base({ installmentsPaid: 5 })) - 5 / 12) < 1e-9, 'progreso 5/12')

  const done = deriveInstallments(base({ installmentsPaid: 12 }))
  console.assert(done.every((c) => c.status === 'paid'), 'todas pagadas con 12/12')
  console.assert(installmentProgress(base({ installmentsPaid: 12 })) === 1, 'progreso 1')

  console.assert(deriveInstallments(base({ installmentsTotal: null })).length === 0, 'sin plan de cuotas → []')

  console.log('installments demo OK')
}
