import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight, LogOut, Moon, Repeat, Sun, Tag, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ResponsiveModal } from '@/components/elements/ResponsiveModal'
import { ServerUrlSection } from '@/components/elements/ServerUrlSection'
import { env } from '@/config/env'
import { useThemeStore } from '@/hooks/useTheme'
import { useAuthStore } from '@/store/useAuthStore'
import { useServerReachable } from '@/store/useOnlineStore'
import { useLogout } from '@/features/auth'
import { DriveSection } from '@/features/drive'
import { DelegationsSection } from '@/features/delegations'
import { NotificationsSection } from '@/features/notifications'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</div>
}

/** Card de gestión (Categorías / Recurrentes): icono + título + descripción, linkea a su página. */
function GestionCard({ to, icon: Icon, title, desc }: { to: string; icon: LucideIcon; title: string; desc: string }) {
  return (
    <Link to={to} className="flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40">
      <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon size={17} />
      </span>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </Link>
  )
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const online = useServerReachable()
  const [profileOpen, setProfileOpen] = useState(false)

  const name = user?.name ?? user?.email?.split('@')[0] ?? 'Usuario'
  const initial = ((user?.name ?? user?.email)?.[0] ?? 'U').toUpperCase()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Ajustes</h1>
        <p className="text-sm text-muted-foreground">Gestioná tu cuenta y preferencias</p>
      </div>

      <div className="flex max-w-2xl flex-col gap-6">
        {/* Perfil */}
        <section>
          <SectionLabel>Perfil</SectionLabel>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex w-full items-center gap-3.5 rounded-xl border bg-card px-5 py-4 text-left transition-colors hover:bg-accent/40"
          >
            <Avatar className="size-12">
              <AvatarFallback className="bg-primary-soft text-lg font-semibold text-primary">{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{name}</div>
              <div className="truncate text-sm text-muted-foreground">{user?.email}</div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
          </button>
        </section>

        {/* Gestión */}
        <section>
          <SectionLabel>Gestión</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <GestionCard to="/categories" icon={Tag} title="Categorías" desc="Creá y editá tus categorías" />
            <GestionCard to="/recurring" icon={Repeat} title="Recurrentes" desc="Movimientos que se repiten" />
          </div>
        </section>

        {env.isNative && <ServerUrlSection />}

        <NotificationsSection />
        {online ? (
          <>
            <DriveSection />
            <DelegationsSection />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Supervisión de cuentas y Google Drive requieren conexión con el servidor.
          </p>
        )}
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} name={name} email={user?.email} initial={initial} />
    </div>
  )
}

/** Detalle de perfil: datos, apariencia y cierre de sesión. Se abre desde la card de Perfil. */
function ProfileModal({
  open, onClose, name, email, initial,
}: {
  open: boolean
  onClose: () => void
  name: string
  email?: string
  initial: string
}) {
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)
  const logout = useLogout()

  return (
    <ResponsiveModal open={open} onOpenChange={(o) => !o && onClose()} title="Mi perfil" className="sm:max-w-md">
      <div className="flex flex-col gap-5 py-1">
        <div className="flex items-center gap-3.5">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary-soft text-xl font-semibold text-primary">{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{name}</div>
            <div className="truncate text-sm text-muted-foreground">{email}</div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            {theme === 'dark' ? <Moon size={16} className="text-muted-foreground" /> : <Sun size={16} className="text-muted-foreground" />}
            <span className="text-sm font-medium">Modo oscuro</span>
          </div>
          <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
        </div>

        <Button variant="destructive" onClick={() => logout()} className="w-full">
          <LogOut size={15} /> Cerrar sesión
        </Button>
      </div>
    </ResponsiveModal>
  )
}
