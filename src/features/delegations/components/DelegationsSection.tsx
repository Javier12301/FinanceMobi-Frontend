import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/elements/ConfirmDialog'
import { errorMessage } from '@/config/api'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useDelegations, useRevokeDelegation } from '../api/useDelegations'
import { InviteDelegateModal } from './InviteDelegateModal'
import type { Delegation } from '../types/delegation'

const roleColor = (role: string) => (role === 'SUPERVISOR' ? 'text-primary border-primary' : 'text-muted-foreground border-muted-foreground')

/** Bloque de delegaciones de Ajustes: personas con acceso + cuentas que gestiono. */
export function DelegationsSection() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useDelegations()
  const revoke = useRevokeDelegation()
  const viewDelegation = useOwnerStore((s) => s.viewDelegation)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [toRevoke, setToRevoke] = useState<Delegation | null>(null)

  const onView = (d: Delegation) => {
    viewDelegation({ ownerId: d.user.id, ownerName: d.user.name, role: d.role })
    navigate({ to: '/dashboard' })
    toast.success(`Viendo cuenta de ${d.user.name}`)
  }

  const onRevoke = () => {
    if (!toRevoke) return
    revoke.mutate(toRevoke.id, {
      onSuccess: () => {
        toast.success('Acceso revocado')
        setToRevoke(null)
      },
      onError: (err) => toast.error(errorMessage(err)),
    })
  }

  return (
    <section>
      <SectionLabel>Delegación</SectionLabel>
      <div className="rounded-xl border bg-card p-3">
        <Tabs defaultValue="granted">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="granted">Acceso a mi cuenta</TabsTrigger>
            <TabsTrigger value="managing">Cuentas que gestiono</TabsTrigger>
          </TabsList>

          {isError && (
            <p className="px-1 py-4 text-sm text-muted-foreground">No se pudieron cargar las delegaciones.</p>
          )}
          {isLoading && <p className="px-1 py-4 text-sm text-muted-foreground">Cargando…</p>}

          {/* Personas con acceso a mi cuenta */}
          <TabsContent value="granted" className="mt-3">
            <div className="divide-y divide-border">
              {data?.granted.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-3 first:pt-0">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={d.user.name} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{d.user.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{d.user.email}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <RoleBadge role={d.role} />
                    <button onClick={() => setToRevoke(d)} className="flex items-center gap-1 text-xs text-destructive">
                      <Trash2 size={14} /> Revocar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {data && data.granted.length === 0 && !isError && (
              <p className="py-4 text-sm text-muted-foreground">Nadie tiene acceso a tu cuenta todavía.</p>
            )}
            <Button variant="outline" className="mt-3 w-full" onClick={() => setInviteOpen(true)}>
              <Plus size={15} /> Invitar persona
            </Button>
          </TabsContent>

          {/* Cuentas que gestiono */}
          <TabsContent value="managing" className="mt-3">
            <div className="divide-y divide-border">
              {data?.managing.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-3 first:pt-0">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={d.user.name} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{d.user.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{d.user.email}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <RoleBadge role={d.role} />
                    <Button size="sm" variant="outline" className="border-primary text-primary" onClick={() => onView(d)}>
                      Ver cuenta
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {data && data.managing.length === 0 && !isError && (
              <p className="py-4 text-sm text-muted-foreground">No gestionás otras cuentas.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <InviteDelegateModal open={inviteOpen} onOpenChange={setInviteOpen} />
      <ConfirmDialog
        open={!!toRevoke}
        onOpenChange={(o) => !o && setToRevoke(null)}
        label="delegación"
        name={toRevoke?.user.name ?? ''}
        onConfirm={onRevoke}
        loading={revoke.isPending}
      />
    </section>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</div>
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${roleColor(role)}`}>{role}</span>
  )
}
