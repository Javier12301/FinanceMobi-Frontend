import { Calendar, Copy, FileText, Pencil, Tag, Trash2, Wallet as WalletIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { IconBadge } from '@/components/elements/IconBadge'
import { Money } from '@/components/elements/Money'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { errorMessage } from '@/config/api'
import { formatDate, formatTime } from '@/utils/formatDate'
import { useWallets } from '@/features/wallets'
import { useCategories } from '@/features/categories'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useTransactionDrawer } from '../useTransactionDrawer'
import { useTransactionModal } from '../useTransactionModal'
import { useCreateTransaction, useDeleteTransaction } from '../api/useTransactionMutations'
import { movementMeta } from '../movementMeta'
import { AttachmentsPanel } from './AttachmentsPanel'

export function TransactionDetailDrawer() {
  const tx = useTransactionDrawer((s) => s.tx)
  const close = useTransactionDrawer((s) => s.close)
  const openModal = useTransactionModal((s) => s.open)
  const openDuplicate = useTransactionModal((s) => s.openDuplicate)
  const isDesktop = useIsDesktop()
  const isReadOnly = useOwnerStore((s) => s.isReadOnly)

  const { data: wallets } = useWallets()
  const { data: categories } = useCategories()
  const del = useDeleteTransaction()
  const create = useCreateTransaction()

  if (!tx) return null

  const meta = movementMeta(tx.movementType)
  const walletName = wallets?.find((w) => w.id === tx.walletId)?.name ?? '—'
  const categoryName = categories?.find((c) => c.id === tx.categoryId)?.name ?? '—'

  const onDelete = () => {
    if (tx.movementType === 'ADJUSTMENT') return
    const snapshot = tx as typeof tx & { movementType: 'INCOME' | 'EXPENSE' | 'TRANSFER' } // datos para deshacer (recrear)
    del.mutate(tx.id, {
      onSuccess: () => {
        close()
        // ponytail: undo = recrear, no hay endpoint de restore
        toast.success('Movimiento eliminado', {
          action: {
            label: 'Deshacer',
            onClick: () => {
              create.mutate({
                walletId: snapshot.walletId,
                categoryId: snapshot.categoryId ?? undefined,
                amount: Number(snapshot.amount),
                movementType: snapshot.movementType,
                date: snapshot.date,
                description: snapshot.description ?? undefined,
                destinationWalletId: snapshot.destinationWalletId ?? undefined,
              })
            },
          },
        })
      },
      onError: (err) => toast.error(errorMessage(err)),
    })
  }

  return (
    <Sheet open={!!tx} onOpenChange={(o) => !o && close()}>
      <SheetContent side={isDesktop ? 'right' : 'bottom'} className="flex w-full flex-col gap-0 p-0 sm:max-w-[420px]">
        <SheetHeader className="border-b">
          <SheetTitle>Detalle de transacción</SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-3.5 border-b p-5">
          <IconBadge icon={meta.icon} size="lg" />
          <div>
            <div className="text-base font-semibold">{tx.description || categoryName}</div>
            <Money amount={tx.amount} movementType={tx.movementType} className="mt-0.5 text-xl" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <DetailRow icon={WalletIcon} label="Billetera" value={walletName} />
          <DetailRow icon={Tag} label="Categoría" value={categoryName} />
          <DetailRow icon={Calendar} label="Fecha" value={`${formatDate(tx.date)} · ${formatTime(tx.date)}`} />
          <DetailRow icon={FileText} label="Descripción" value={tx.description || '—'} />

          {tx.movementType !== 'TRANSFER' && tx.movementType !== 'ADJUSTMENT' && <AttachmentsPanel transactionId={tx.id} />}
        </div>

        {!isReadOnly && tx.movementType !== 'ADJUSTMENT' && (
          <div className="flex flex-col gap-2.5 border-t p-4 pb-[calc(1rem_+_var(--safe-area-inset-bottom))]">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                openDuplicate(tx)
                close()
              }}
            >
              <Copy size={15} /> Repetir
            </Button>
            <div className="flex gap-2.5">
              <Button
                variant="outline"
                className="flex-1 border-primary text-primary hover:bg-primary-soft"
                onClick={() => {
                  openModal(tx)
                  close()
                }}
              >
                <Pencil size={15} /> Editar
              </Button>
              <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10" onClick={onDelete} disabled={del.isPending}>
                <Trash2 size={15} /> Eliminar
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof WalletIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between border-b px-5 py-3.5">
      <div className="flex items-center gap-2.5 text-muted-foreground">
        <Icon size={16} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
