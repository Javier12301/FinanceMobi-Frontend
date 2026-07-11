import { useState } from 'react'
import { Plus, Wallet as WalletIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/elements/PageHeader'
import { EmptyState } from '@/components/elements/EmptyState'
import { ConfirmDialog } from '@/components/elements/ConfirmDialog'
import { errorMessage, isApiError } from '@/config/api'
import { useOwnerStore } from '@/store/useOwnerStore'
import {
  useWallets,
  useWalletTypes,
  useDeleteWallet,
  useWalletModal,
  WalletCard,
  WalletAdjustmentModal,
  type Wallet,
} from '@/features/wallets'

export function WalletsPage() {
  const { data: wallets, isLoading } = useWallets()
  const { data: types } = useWalletTypes()
  const del = useDeleteWallet()
  const openModal = useWalletModal((s) => s.open)
  const isReadOnly = useOwnerStore((s) => s.isReadOnly)
  const [toDelete, setToDelete] = useState<Wallet | null>(null)
  const [toAdjust, setToAdjust] = useState<Wallet | null>(null)

  const typeName = (id: number) => types?.find((t) => t.id === id)?.name

  const onConfirmDelete = () => {
    if (!toDelete) return
    del.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success('Billetera eliminada')
        setToDelete(null)
      },
      onError: (err) => {
        if (isApiError(err) && err.status === 409) {
          toast.error('No se puede eliminar: la billetera tiene transacciones')
        } else {
          toast.error(errorMessage(err))
        }
        setToDelete(null)
      },
    })
  }

  return (
    <div>
      <PageHeader
        title="Billeteras"
        action={
          !isReadOnly && (
            <Button onClick={() => openModal()}>
              <Plus size={16} /> Nueva billetera
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : wallets && wallets.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((w) => (
            <WalletCard
              key={w.id}
              wallet={w}
              typeName={typeName(w.typeId)}
              readOnly={isReadOnly}
              onEdit={(wallet) => openModal(wallet)}
              onDelete={setToDelete}
              onAdjust={setToAdjust}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={WalletIcon}
          title="Todavía no tenés billeteras"
          description="Creá tu primera billetera para empezar a registrar movimientos."
          action={
            !isReadOnly && (
              <Button onClick={() => openModal()}>
                <Plus size={16} /> Nueva billetera
              </Button>
            )
          }
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        label="billetera"
        name={toDelete?.name ?? ''}
        onConfirm={onConfirmDelete}
        loading={del.isPending}
      />
      <WalletAdjustmentModal wallet={toAdjust} onClose={() => setToAdjust(null)} />
    </div>
  )
}
