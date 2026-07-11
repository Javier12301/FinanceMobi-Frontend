import { MoreVertical, Pencil, SlidersHorizontal, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IconBadge } from '@/components/elements/IconBadge'
import { Money } from '@/components/elements/Money'
import { walletTypeMeta } from '../walletTypeMeta'
import type { Wallet } from '../types/wallet'

interface WalletCardProps {
  wallet: Wallet
  typeName?: string
  readOnly?: boolean
  onEdit: (wallet: Wallet) => void
  onDelete: (wallet: Wallet) => void
  onAdjust: (wallet: Wallet) => void
}

export function WalletCard({ wallet, typeName, readOnly, onEdit, onDelete, onAdjust }: WalletCardProps) {
  const meta = walletTypeMeta(typeName)

  return (
    <div className="relative rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <IconBadge icon={meta.icon} variant="primary" size="lg" />
          <div>
            <div className="text-[15px] font-semibold">{wallet.name}</div>
            <span className="mt-0.5 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">
              {meta.label}
            </span>
          </div>
        </div>

        {!readOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground hover:bg-accent/60">
              <MoreVertical size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAdjust(wallet)}>
                <SlidersHorizontal size={14} /> Ajustar saldo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(wallet)}>
                <Pencil size={14} /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(wallet)}>
                <Trash2 size={14} /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Money amount={wallet.currentBalance} className="text-2xl tracking-tight" />
      <div className="mt-1 text-xs text-muted-foreground">Saldo disponible</div>
    </div>
  )
}
