import { Calendar, FileText, Pencil, Tag, Trash2, Wallet as WalletIcon, ExternalLink } from 'lucide-react'
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
import { errorMessage, isApiError } from '@/config/api'
import { formatDate, formatTime } from '@/utils/formatDate'
import { useWallets } from '@/features/wallets'
import { useCategories } from '@/features/categories'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useTransactionDrawer } from '../useTransactionDrawer'
import { useTransactionModal } from '../useTransactionModal'
import { useDeleteTransaction } from '../api/useTransactionMutations'
import { useAttachments } from '../api/useAttachments'
import { movementMeta } from '../movementMeta'

export function TransactionDetailDrawer() {
  const tx = useTransactionDrawer((s) => s.tx)
  const close = useTransactionDrawer((s) => s.close)
  const openModal = useTransactionModal((s) => s.open)
  const isDesktop = useIsDesktop()
  const isReadOnly = useOwnerStore((s) => s.isReadOnly)

  const { data: wallets } = useWallets()
  const { data: categories } = useCategories()
  const del = useDeleteTransaction()
  const { data: attachments } = useAttachments(tx?.id ?? null)

  if (!tx) return null

  const meta = movementMeta(tx.movementType)
  const walletName = wallets?.find((w) => w.id === tx.walletId)?.name ?? '—'
  const categoryName = categories?.find((c) => c.id === tx.categoryId)?.name ?? '—'

  const onDelete = () => {
    del.mutate(tx.id, {
      onSuccess: () => {
        toast.success('Movimiento eliminado')
        close()
      },
      onError: (err) => {
        if (isApiError(err) && err.notImplemented) {
          toast.info('La eliminación de movimientos no está disponible aún')
        } else {
          toast.error(errorMessage(err))
        }
      },
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

          {attachments && attachments.length > 0 && (
            <div className="m-4 flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2.5">
                <IconBadge icon={FileText} size="sm" />
                <div className="text-xs">
                  <div className="font-medium">Comprobante</div>
                  <div className="text-muted-foreground">{attachments[0].mimeType}</div>
                </div>
              </div>
              <a
                href={`https://drive.google.com/file/d/${attachments[0].googleFileId}/view`}
                target="_blank"
                rel="noreferrer"
                className="text-primary"
              >
                <ExternalLink size={15} />
              </a>
            </div>
          )}
        </div>

        {!isReadOnly && (
          <div className="flex gap-2.5 border-t p-4">
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
