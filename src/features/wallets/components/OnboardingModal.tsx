import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/config/api'
import { ResponsiveModal } from '@/components/elements/ResponsiveModal'
import { useAuthStore } from '@/store/useAuthStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useTransactions } from '@/features/transactions'
import { useWallets } from '../api/useWallets'
import { useUpdateWallet } from '../api/useWalletMutations'

/**
 * Onboarding suave: la primera vez que un usuario entra sin movimientos, lo invitamos a
 * configurar el saldo inicial de su billetera Efectivo (creada por default al registrarse).
 * Se puede dejar en 0. Flag en localStorage por usuario para no repetir. Sin backend nuevo.
 */
export function OnboardingModal() {
  const user = useAuthStore((s) => s.user)
  const isReadOnly = useOwnerStore((s) => s.isReadOnly)
  const { data: wallets } = useWallets()
  const { data: txns } = useTransactions()
  const update = useUpdateWallet()

  const [balance, setBalance] = useState('')
  const [done, setDone] = useState(false)

  const flagKey = user ? `fv:onboarded:${user.id}` : null
  const target = wallets?.find((w) => w.name === 'Efectivo') ?? wallets?.[0]
  const alreadyOnboarded = flagKey ? !!localStorage.getItem(flagKey) : true

  const shouldShow =
    !done && !isReadOnly && !!target && txns !== undefined && txns.length === 0 && !alreadyOnboarded

  if (!shouldShow) return null

  const finish = () => {
    if (flagKey) localStorage.setItem(flagKey, '1')
    setDone(true)
  }

  const save = () => {
    update.mutate(
      { id: target!.id, input: { initialBalance: Number(balance) || 0 } },
      {
        onSuccess: () => {
          toast.success('¡Listo! Ya podés registrar tus movimientos')
          finish()
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    )
  }

  return (
    <ResponsiveModal
      open
      onOpenChange={(o) => !o && finish()}
      title="¡Bienvenido!"
      className="sm:max-w-md"
      footer={
        <div className="flex w-full gap-2.5">
          <Button variant="outline" onClick={finish} className="flex-1">
            Ahora no
          </Button>
          <Button onClick={save} disabled={update.isPending} className="flex-1">
            {update.isPending ? 'Guardando…' : 'Empezar'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 py-1">
        <div className="flex items-center gap-3 rounded-xl bg-primary-soft p-4 text-primary">
          <Wallet size={22} className="shrink-0" />
          <p className="text-sm">
            Creamos tu billetera <strong>Efectivo</strong>. ¿Cuánto tenés ahora? Así arrancás con tu saldo real.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ob-balance">Saldo inicial en efectivo</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              id="ob-balance"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="pl-7 text-lg font-semibold"
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground">Podés dejarlo en 0 y cargarlo más adelante.</p>
        </div>
      </div>
    </ResponsiveModal>
  )
}
