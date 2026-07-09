import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { errorMessage, isNotAvailable } from '@/config/api'
import { formatCurrency, parseDecimal } from '@/utils/formatCurrency'
import { ResponsiveModal } from '@/components/elements/ResponsiveModal'
import { useWallets } from '@/features/wallets'
import { useTransactions } from '@/features/transactions'
import { useDebtModal } from '../useDebtModal'
import { useDebts, usePayDebt } from '../api/useDebts'
import { deriveInstallments, installmentProgress, projectedInstallmentAmount, type Installment } from '../installments'
import type { Debt } from '../types/debt'

const todayIso = () => new Date().toISOString()

/**
 * Detalle de una deuda con seguimiento de cuotas y acción de pago/cobro.
 * Montado una vez (global) y disparado por `useDebtModal.openView(debt)`.
 */
export function DebtDetailDrawer() {
  const { isOpen, mode, viewing, close } = useDebtModal()
  const open = isOpen && mode === 'view' && !!viewing

  // La deuda del store es un snapshot; tras un pago la lista se invalida, así que
  // leemos la versión fresca por id y caemos al snapshot si aún no llegó.
  const { data: debts } = useDebts()
  const debt = useMemo(
    () => debts?.find((d) => d.id === viewing?.id) ?? viewing ?? undefined,
    [debts, viewing],
  )

  if (!open || !debt) return null
  return <DebtDetailContent debt={debt} onClose={close} />
}

function DebtDetailContent({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const { data: wallets } = useWallets()
  const pay = usePayDebt()

  // Pagos reales de esta deuda (una Transaction por cuota, con su monto realmente pagado).
  const { data: payments } = useTransactions({ debtId: debt.id })
  const paidAmounts = useMemo(() => {
    const sorted = [...(payments ?? [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
    return sorted.map((t) => parseDecimal(t.amount))
  }, [payments])

  const [trackOpen, setTrackOpen] = useState(false)

  const owed = debt.direction === 'OWED_TO_ME'
  const installments = useMemo(() => deriveInstallments(debt), [debt])
  const progress = installmentProgress(debt)
  const nextInstallment = installments.find((c) => c.status === 'next')
  const remaining = parseDecimal(debt.remaining)
  const isSettled = remaining <= 0 || debt.status === 'PAID'

  const interestPaid = parseDecimal(debt.interestPaid)
  const principal = parseDecimal(debt.principal)
  // Total real desembolsado = capital saldado + recargos acumulados.
  const totalReal = principal - remaining + interestPaid
  // Monto sugerido de la próxima cuota (saldo capital / restantes).
  const projected = projectedInstallmentAmount(debt)

  const [walletId, setWalletId] = useState('')
  useEffect(() => {
    // prefill con la primera billetera si hay una sola
    if (wallets?.length === 1) setWalletId(wallets[0].id)
  }, [wallets])

  // Monto de pago editable: arranca en la cuota proyectada y se re-sugiere tras cada pago.
  const [payInput, setPayInput] = useState(() => String(Math.round(projected)))
  useEffect(() => {
    setPayInput(String(Math.round(projected)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debt.installmentsPaid, debt.remaining])

  const payAmount = Number(payInput)
  // Umbral de 1 para no marcar "recargo" por diferencias de redondeo del proyectado.
  const surcharge = payAmount - projected >= 1 ? payAmount - projected : 0

  const handlePay = () => {
    if (!walletId) return toast.error(`Elegí la billetera para ${owed ? 'el cobro' : 'el pago'}`)
    if (!payAmount || payAmount <= 0) return toast.error('Ingresá un monto mayor a 0')
    pay.mutate(
      { id: debt.id, walletId, amount: payAmount, date: todayIso() },
      {
        onSuccess: () => toast.success(owed ? 'Cobro registrado' : 'Pago registrado'),
        onError: (err) => {
          if (isNotAvailable(err)) toast.error('El pago de cuotas todavía no está disponible')
          else toast.error(errorMessage(err))
        },
      },
    )
  }

  const payLabel = owed ? 'Registrar cobro' : 'Pagar cuota'

  return (
    <ResponsiveModal
      open
      onOpenChange={(o) => !o && onClose()}
      title={debt.counterparty}
      className="sm:max-w-lg"
      footer={
        !isSettled && (
          <Button onClick={handlePay} disabled={pay.isPending || !payAmount || payAmount <= 0} className="w-full sm:w-auto">
            {pay.isPending ? 'Registrando…' : `${payLabel} · ${formatCurrency(payAmount || 0)}`}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-4 py-1">
        {/* ── Pago arriba (acción principal, sin scrollear) ── */}
        {isSettled ? (
          <div className="rounded-xl bg-primary-soft px-4 py-3 text-center text-sm font-semibold text-primary">
            {owed ? 'Préstamo cobrado por completo ✓' : 'Deuda saldada ✓'}
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            {/* Monto a pagar (editable: permite recargos de mora/ajustes bancarios) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="pay-amount">
                {owed ? 'Monto a cobrar' : 'Monto a pagar'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">$</span>
                <Input
                  id="pay-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={payInput}
                  onChange={(e) => setPayInput(e.target.value)}
                  className="h-12 pl-7 text-lg font-bold"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Cuota pactada {formatCurrency(projected)}.{' '}
                {surcharge > 0
                  ? `Incluye ${formatCurrency(surcharge)} de recargo (no baja el capital).`
                  : 'Podés ajustarlo si el banco te cobró un recargo.'}
              </p>
            </div>

            {/* Billetera del pago */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="pay-wallet">
                {owed ? 'Billetera donde entra el cobro' : 'Billetera de la que sale el pago'}
              </label>
              <Select value={walletId} onValueChange={setWalletId}>
                <SelectTrigger id="pay-wallet" className="w-full">
                  <SelectValue placeholder="Elegí una billetera" />
                </SelectTrigger>
                <SelectContent>
                  {wallets?.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Métricas: capital vs recargos */}
        <div className="space-y-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <MetricLine label="Saldo pendiente de capital" value={formatCurrency(debt.remaining)}
            valueClass={cn('font-semibold', owed ? 'text-success' : 'text-destructive')} />
          {interestPaid > 0 && (
            <MetricLine label="Recargos / intereses" value={formatCurrency(interestPaid)} valueClass="font-semibold text-destructive" />
          )}
          <div className="border-t border-border pt-2">
            <MetricLine label="Deuda original pactada" value={formatCurrency(debt.principal)} muted />
            <MetricLine label="Total real pagado" value={formatCurrency(totalReal)}
              valueClass={cn('font-semibold', interestPaid > 0 && 'text-destructive')} />
          </div>
        </div>

        {/* Seguimiento de cuotas (desplegable) */}
        {debt.installmentsTotal != null && (
          <div className="rounded-xl border border-border bg-card">
            <button
              type="button"
              onClick={() => setTrackOpen((v) => !v)}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <ProgressRing value={progress} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">
                  {debt.installmentsPaid} de {debt.installmentsTotal} {owed ? 'cobradas' : 'pagadas'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isSettled
                    ? 'Deuda saldada'
                    : nextInstallment
                      ? `Próxima: cuota ${nextInstallment.n}`
                      : '—'}
                </div>
              </div>
              <ChevronDown size={18} className={cn('shrink-0 text-muted-foreground transition-transform', trackOpen && 'rotate-180')} />
            </button>
            {trackOpen && (
              <ul className="divide-y divide-border border-t border-border px-4 pb-1">
                {installments.map((c) => (
                  <InstallmentRow
                    key={c.n}
                    installment={c}
                    owed={owed}
                    realAmount={c.status === 'paid' ? paidAmounts[c.n - 1] : undefined}
                  />
                ))}
              </ul>
            )}
          </div>
        )}

        {debt.notes && (
          <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground">{debt.notes}</p>
        )}
      </div>
    </ResponsiveModal>
  )
}

function MetricLine({ label, value, valueClass, muted }: { label: string; value: string; valueClass?: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn('text-muted-foreground', muted && 'text-xs')}>{label}</span>
      <span className={cn('tabular-nums', muted ? 'text-xs text-muted-foreground' : 'text-foreground', valueClass)}>{value}</span>
    </div>
  )
}

function InstallmentRow({ installment: c, owed, realAmount }: { installment: Installment; owed: boolean; realAmount?: number }) {
  const paid = c.status === 'paid'
  const isNext = c.status === 'next'
  // Para cuotas pagadas mostramos lo realmente pagado; si difiere del pactado, tachamos el pactado.
  const differs = paid && realAmount != null && Math.abs(realAmount - c.amount) >= 1
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          paid ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground',
        )}
      >
        {paid ? <Check size={14} /> : c.n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">Cuota {c.n}</div>
        <div className="text-xs text-muted-foreground">
          {paid ? (owed ? 'cobrada' : 'pagada') : isNext ? 'próxima' : 'pendiente'}
          {differs && <span className="text-destructive"> · con recargo</span>}
          {!paid && c.dueDate && ` · vence ${new Date(c.dueDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}`}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {differs ? (
          <>
            <span className="mr-1.5 text-xs tabular-nums text-muted-foreground line-through">{formatCurrency(c.amount)}</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(realAmount!)}</span>
          </>
        ) : (
          <span className="text-sm font-semibold tabular-nums text-muted-foreground">
            {formatCurrency(paid && realAmount != null ? realAmount : c.amount)}
          </span>
        )}
      </div>
    </li>
  )
}

/** Anillo de progreso simple en SVG. ponytail: un ring no justifica una lib de charts. */
function ProgressRing({ value }: { value: number }) {
  const r = 20
  const c = 2 * Math.PI * r
  const pct = Math.round(value * 100)
  return (
    <div className="relative size-12 shrink-0">
      <svg viewBox="0 0 48 48" className="size-12 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-surface" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
          className="text-primary transition-all"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">
        {pct}%
      </span>
    </div>
  )
}
