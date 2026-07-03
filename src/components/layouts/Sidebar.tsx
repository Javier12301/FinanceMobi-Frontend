import { Link } from '@tanstack/react-router'
import { LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useLogout } from '@/features/auth'
import { navItems } from './navItems'

/** Barra lateral fija (md+). */
export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const delegation = useOwnerStore((s) => s.delegation)
  const resetToSelf = useOwnerStore((s) => s.resetToSelf)
  const selfId = useOwnerStore((s) => s.selfId)
  const logout = useLogout()

  return (
    <nav className="flex h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-[13px] font-bold text-primary-foreground">
          FV
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-primary">FinanceMobile</span>
      </div>

      {/* Badge de delegación */}
      {delegation && (
        <div className="mx-2.5 mt-2.5 rounded-lg border border-primary/20 bg-primary-soft px-2.5 py-2">
          <div className="flex items-center gap-1.5">
            <User size={14} className="text-primary" />
            <span className="truncate text-[11px] font-medium text-primary">
              Viendo: {delegation.ownerName}
            </span>
          </div>
          <button
            onClick={() => selfId && resetToSelf(selfId)}
            className="mt-1 text-[10px] text-muted-foreground underline"
          >
            Volver a mi cuenta
          </button>
        </div>
      )}

      {/* Nav */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={[
              // Layout & tipografía
              'mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13px] font-medium',
              // Transición suave
              'transition-colors duration-150',
              // Estado NORMAL: colores del sidebar
              'text-sidebar-foreground',
              // Estado HOVER: fondo y texto del hover
              'hover:bg-sidebar-hover hover:text-sidebar-hover-foreground',
              // Estado ACTIVO: sobrescribe via data-attribute (mayor especificidad)
              'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
              // HOVER sobre ACTIVO: mantiene los colores activos
              'data-[active=true]:hover:bg-sidebar-accent data-[active=true]:hover:text-sidebar-accent-foreground',
            ].join(' ')}
            activeProps={{ 'data-active': 'true' }}
          >
            {({ isActive: _isActive }) => (
              <>
                <item.icon size={18} />
                {item.label}
              </>
            )}
          </Link>
        ))}
      </div>

      {/* Usuario + logout */}
      <div className="border-t border-sidebar-border p-3.5">
        <div className="mb-2.5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary">
            {((user?.name ?? user?.email)?.[0] ?? 'U').toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold">{user?.name ?? user?.email ?? 'Usuario'}</div>
            {user?.name && <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>}
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>
    </nav>
  )
}
