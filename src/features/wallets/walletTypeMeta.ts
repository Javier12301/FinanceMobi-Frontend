import { Coins, Landmark, CreditCard, PiggyBank, Wallet as WalletIcon, type LucideIcon } from 'lucide-react'

interface WalletTypeMeta {
  label: string
  icon: LucideIcon
}

/** Mapea el name del WalletType del backend a label en español + ícono. */
const META: Record<string, WalletTypeMeta> = {
  CASH: { label: 'Efectivo', icon: Coins },
  BANK_ACCOUNT: { label: 'Banco', icon: Landmark },
  CREDIT_CARD: { label: 'Tarjeta', icon: CreditCard },
  SAVINGS: { label: 'Ahorro', icon: PiggyBank },
}

export function walletTypeMeta(name: string | undefined): WalletTypeMeta {
  return (name && META[name]) || { label: name ?? 'Billetera', icon: WalletIcon }
}
