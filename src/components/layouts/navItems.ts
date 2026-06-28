import { Home, Wallet, ArrowLeftRight, CalendarRange, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/** Items de navegación compartidos por Sidebar (desktop) y BottomNav (mobile). */
export const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Inicio', icon: Home },
  { to: '/wallets', label: 'Billeteras', icon: Wallet },
  { to: '/transactions', label: 'Movimientos', icon: ArrowLeftRight },
  { to: '/plan', label: 'Plan', icon: CalendarRange },
  { to: '/settings', label: 'Ajustes', icon: Settings },
]
