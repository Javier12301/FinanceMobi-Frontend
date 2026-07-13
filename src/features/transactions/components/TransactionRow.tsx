import { Clock, Paperclip } from 'lucide-react'
import { IconBadge } from '@/components/elements/IconBadge'
import { Money } from '@/components/elements/Money'
import { formatDate, formatTime } from '@/utils/formatDate'
import { movementMeta } from '../movementMeta'
import type { Transaction } from '../types/transaction'

interface TransactionRowProps {
  tx: Transaction
  walletName?: string
  categoryName?: string
  hasReceipt?: boolean
  onClick?: (tx: Transaction) => void
}

/** Fila de transacción reutilizable (lista mobile + "últimas" del dashboard). */
export function TransactionRow({ tx, walletName, categoryName, hasReceipt, onClick }: TransactionRowProps) {
  const meta = movementMeta(tx.movementType)
  const title = tx.description || categoryName || meta.label
  // Gasto futuro: todavía no descontó plata. Se marca con reloj y se dice cuándo se va a aplicar.
  const isPending = tx.status === 'PENDING'

  return (
    <button
      type="button"
      onClick={() => onClick?.(tx)}
      className="flex w-full items-center gap-3 border-b px-1 py-3 text-left last:border-b-0 hover:bg-accent/30"
    >
      <IconBadge icon={isPending ? Clock : meta.icon} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{title}</span>
          {isPending && <Clock size={12} className="shrink-0 text-muted-foreground" aria-label="Gasto futuro" />}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {walletName ? `${walletName} · ` : ''}
          {isPending ? `Programado para el ${formatDate(tx.date)}` : `${formatDate(tx.date)}, ${formatTime(tx.date)}`}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Money
          amount={tx.amount}
          movementType={tx.movementType}
          className={isPending ? 'text-sm opacity-60' : 'text-sm'}
        />
        {hasReceipt && <Paperclip size={13} className="text-muted-foreground" />}
      </div>
    </button>
  )
}
