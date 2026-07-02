import type { ReactNode } from 'react'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useMe } from '@/features/auth'
import { TransactionFormModal, TransactionDetailDrawer } from '@/features/transactions'
import { WalletFormModal } from '@/features/wallets'
import { DebtFormModal, useDebtModal } from '@/features/debts'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

/** Shell de la app: sidebar (md+) o bottom nav + FAB (mobile). */
export function MainLayout({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop()
  useMe() // enriquece el store con name + driveConnected (una sola vez)
  const debtOpen = useDebtModal((s) => s.isOpen)
  const closeDebt = useDebtModal((s) => s.close)

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      {isDesktop && <Sidebar />}

      <main className="h-dvh flex-1 overflow-y-auto">
        <div className={isDesktop ? 'mx-auto max-w-[1400px] p-8' : 'px-4 pb-24 pt-5'}>
          {children}
        </div>
      </main>

      {!isDesktop && <BottomNav />}

      {/* Modales/drawers globales (los abren FAB / botones / filas de cada página). */}
      <TransactionFormModal />
      <TransactionDetailDrawer />
      <WalletFormModal />
      <DebtFormModal open={debtOpen} onClose={closeDebt} />
    </div>
  )
}
