import { useEffect, type ReactNode } from 'react'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useMe, useCheckIn } from '@/features/auth'
import { TransactionFormModal, TransactionDetailDrawer } from '@/features/transactions'
import { WalletFormModal, OnboardingModal } from '@/features/wallets'
import { DebtFormModal, DebtDetailDrawer, useDebtModal } from '@/features/debts'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { OfflineBanner } from './OfflineBanner'

/** Shell de la app: sidebar (md+) o bottom nav + FAB (mobile). */
export function MainLayout({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop()
  useMe() // enriquece el store con name + driveConnected (una sola vez)
  const checkIn = useCheckIn()
  // Marca la entrada del día al abrir la app (idempotente); alimenta la racha.
  useEffect(() => {
    checkIn.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const debtCreateOpen = useDebtModal((s) => s.isOpen && s.mode === 'create')
  const closeDebt = useDebtModal((s) => s.close)

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      {isDesktop && <Sidebar />}

      <div className="flex flex-1 flex-col overflow-hidden">
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto">
          <div className={isDesktop ? 'mx-auto max-w-[1400px] p-8' : 'px-4 pb-24 pt-5'}>
            {children}
          </div>
        </main>
      </div>

      {!isDesktop && <BottomNav />}

      {/* Modales/drawers globales (los abren FAB / botones / filas de cada página). */}
      <TransactionFormModal />
      <TransactionDetailDrawer />
      <WalletFormModal />
      <OnboardingModal />
      <DebtFormModal open={debtCreateOpen} onClose={closeDebt} />
      <DebtDetailDrawer />
    </div>
  )
}
