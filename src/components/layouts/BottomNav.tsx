import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useTransactionModal } from '@/features/transactions'
import { navItems } from './navItems'

/** Barra inferior + FAB de registro rápido (mobile). */
export function BottomNav() {
  const isReadOnly = useOwnerStore((s) => s.isReadOnly)
  const openTxn = useTransactionModal((s) => s.open)

  return (
    <>
      {/* FAB */}
      {!isReadOnly && (
        <button
          onClick={() => openTxn()}
          aria-label="Registrar movimiento"
          className="fixed bottom-20 left-1/2 z-30 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95"
        >
          <Plus size={26} />
        </button>
      )}

      {/* Tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex h-16 border-t bg-background pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground"
            activeProps={{ className: 'text-primary' }}
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={cn(isActive && 'text-primary')} />
                {item.label}
              </>
            )}
          </Link>
        ))}
      </nav>
    </>
  )
}
