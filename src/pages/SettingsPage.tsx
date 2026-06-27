import { LogOut, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useThemeStore } from '@/hooks/useTheme'
import { useAuthStore } from '@/store/useAuthStore'
import { useLogout } from '@/features/auth'
import { DriveSection } from '@/features/drive'
import { DelegationsSection } from '@/features/delegations'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</div>
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)
  const logout = useLogout()

  return (
    <div>
      <h1 className="mb-7 text-xl font-semibold">Ajustes</h1>

      <div className="flex max-w-2xl flex-col gap-6">
        {/* Perfil */}
        <section>
          <SectionLabel>Perfil</SectionLabel>
          <div className="flex items-center gap-3.5 rounded-xl border bg-card px-5 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-xl font-semibold text-primary">
              {(user?.email?.[0] ?? 'U').toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold">{user?.email?.split('@')[0] ?? 'Usuario'}</div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
            </div>
          </div>
        </section>

        <DriveSection />
        <DelegationsSection />

        {/* Apariencia */}
        <section>
          <SectionLabel>Apariencia</SectionLabel>
          <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4">
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? <Moon size={16} className="text-muted-foreground" /> : <Sun size={16} className="text-muted-foreground" />}
              <div>
                <div className="text-sm font-medium">Modo oscuro</div>
                <div className="text-xs text-muted-foreground">Personalizá la apariencia de la app</div>
              </div>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
          </div>
        </section>

        {/* Sesión */}
        <section>
          <SectionLabel>Sesión</SectionLabel>
          <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4">
            <div>
              <div className="text-sm font-medium">Cerrar sesión</div>
              <div className="text-xs text-muted-foreground">Revoca tu sesión actual en este dispositivo</div>
            </div>
            <Button variant="destructive" onClick={() => logout()}>
              <LogOut size={15} /> Cerrar sesión
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
