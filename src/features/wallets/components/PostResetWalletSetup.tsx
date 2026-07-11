import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResponsiveModal } from '@/components/elements/ResponsiveModal'
import { errorMessage } from '@/config/api'
import { useDeleteWallet, useUpdateWallet } from '../api/useWalletMutations'
import type { Wallet } from '../types/wallet'

/** Configuración opcional de las billeteras que sobreviven a un reinicio contable. */
export function PostResetWalletSetup({ wallets, onFinish }: { wallets: Wallet[]; onFinish: () => void }) {
  const [remaining, setRemaining] = useState(wallets)
  const [index, setIndex] = useState(0)
  const [balance, setBalance] = useState('')
  const update = useUpdateWallet()
  const remove = useDeleteWallet()
  const wallet = remaining[index]

  useEffect(() => { setRemaining(wallets); setIndex(0); setBalance('') }, [wallets])
  const next = () => {
    if (index + 1 >= remaining.length) onFinish()
    else { setIndex((value) => value + 1); setBalance('') }
  }
  const save = () => {
    if (!wallet) return onFinish()
    if (!balance.trim()) return next()
    if (Number.isNaN(Number(balance))) return toast.error('Ingresá un saldo válido')
    update.mutate({ id: wallet.id, input: { initialBalance: Number(balance) } }, {
      onSuccess: next,
      onError: (error) => toast.error(errorMessage(error)),
    })
  }
  const deleteWallet = () => {
    if (!wallet) return
    remove.mutate(wallet.id, {
      onSuccess: () => {
        const updated = remaining.filter((item) => item.id !== wallet.id)
        setRemaining(updated)
        if (updated.length === 0) onFinish()
        else if (index >= updated.length) setIndex(updated.length - 1)
      },
      onError: (error) => toast.error(errorMessage(error)),
    })
  }

  if (!wallet) return null
  const pending = update.isPending || remove.isPending
  return (
    <ResponsiveModal open onOpenChange={(open) => !open && onFinish()} title="Configurar billeteras" description={`Billetera ${index + 1} de ${remaining.length}`} className="sm:max-w-md">
      <div className="flex flex-col gap-4 py-1">
        <p className="text-sm text-muted-foreground">La billetera <strong className="text-foreground">{wallet.name}</strong> quedó en $0. Podés establecer su saldo de inicio o continuar así.</p>
        <div className="space-y-1.5">
          <Label htmlFor="post-reset-balance">Saldo de inicio tras reinicio</Label>
          <Input id="post-reset-balance" type="number" inputMode="decimal" step="0.01" placeholder="0" value={balance} onChange={(event) => setBalance(event.target.value)} autoFocus />
        </div>
        <Button variant="ghost" className="self-start text-destructive hover:text-destructive" onClick={deleteWallet} disabled={pending}>Eliminar esta billetera</Button>
      </div>
      <div className="flex justify-end gap-2.5 pt-2">
        <Button variant="outline" onClick={next} disabled={pending}>Omitir</Button>
        <Button onClick={save} disabled={pending}>{update.isPending ? 'Guardando...' : 'Guardar y continuar'}</Button>
      </div>
    </ResponsiveModal>
  )
}
