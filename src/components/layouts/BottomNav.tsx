import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOwnerStore } from '@/store/useOwnerStore'
import { navItems } from './navItems'
import { QuickActionsSheet } from './QuickActionsSheet'

/** Items a mostrar en la barra móvil: Inicio, Billeteras, Plan, Ajustes (sin Movimientos). */
const MOBILE_NAV_ITEMS = navItems.filter((item) => item.to !== '/transactions')

/** Barra inferior mobile con 4 tabs + botón central elevado de acciones rápidas. */
export function BottomNav() {
  const isReadOnly = useOwnerStore((s) => s.isReadOnly)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      {/* Tab bar: 2 izq + espaciador central + 2 der.
          El padding de safe-area va en el <nav> exterior para que la fila de tabs
          conserve su alto de 64px por encima de la barra de gestos (si fuera al
          mismo elemento con border-box, el inset comería los 64px y aplastaría todo). */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background pb-[var(--safe-area-inset-bottom)]">
        <div className="flex h-[var(--bottom-nav-height)]">
        {/* Primera mitad (2 items a la izquierda) */}
        <div className="flex flex-1">
          {MOBILE_NAV_ITEMS.slice(0, 2).map((item) => (
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
        </div>

        {/* Centro: botón '+' elevado (oculto si isReadOnly) */}
        <div className="relative flex w-16 items-center justify-center">
          {!isReadOnly && (
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Abrir menú de acciones rápidas"
              className="absolute bottom-1 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
            >
              <Plus size={26} />
            </button>
          )}
        </div>

        {/* Segunda mitad (2 items a la derecha) */}
        <div className="flex flex-1">
          {MOBILE_NAV_ITEMS.slice(2, 4).map((item) => (
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
        </div>
        </div>
      </nav>

      {/* Bottom sheet de acciones rápidas */}
      <QuickActionsSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
