import { useState } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/config/api'
import { ResponsiveModal } from '@/components/elements/ResponsiveModal'
import { useInviteDelegation } from '../api/useDelegations'
import type { DelegationRole } from '../types/delegation'

interface InviteDelegateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ROLES: { role: DelegationRole; desc: string }[] = [
  { role: 'SUPERVISOR', desc: 'puede ver, crear, editar y eliminar' },
  { role: 'ASESOR', desc: 'solo lectura' },
]

export function InviteDelegateModal({ open, onOpenChange }: InviteDelegateModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<DelegationRole>('SUPERVISOR')
  const invite = useInviteDelegation()

  const onSubmit = () => {
    if (!email.trim()) return toast.error('Ingresá un email')
    invite.mutate(
      { email, role },
      {
        onSuccess: () => {
          toast.success('Invitación enviada')
          setEmail('')
          onOpenChange(false)
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    )
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Invitar delegado"
      className="sm:max-w-md"
      footer={
        <div className="flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={invite.isPending}>
            <Send size={14} /> Enviar invitación
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 py-1">
        <div className="space-y-1.5">
          <Label htmlFor="d-email">Email</Label>
          <Input
            id="d-email"
            type="email"
            placeholder="delegado@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Rol</Label>
          <div className="flex overflow-hidden rounded-lg border">
            {ROLES.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => setRole(r.role)}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-semibold transition-colors',
                  role === r.role ? 'bg-primary-soft text-primary' : 'text-muted-foreground',
                )}
              >
                {r.role}
              </button>
            ))}
          </div>
          <ul className="space-y-0.5 text-[11px] text-muted-foreground">
            {ROLES.map((r) => (
              <li key={r.role}>
                · <strong className="text-foreground">{r.role}</strong>: {r.desc}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ResponsiveModal>
  )
}
