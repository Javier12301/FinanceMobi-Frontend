import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ResponsiveModal } from '@/components/elements/ResponsiveModal'
import { errorMessage } from '@/config/api'
import { parseDecimal } from '@/utils/formatCurrency'
import type { Wallet } from '../types/wallet'
import { useWalletAdjustment } from '../api/useWalletAdjustment'

export function WalletAdjustmentModal({ wallet, onClose }: { wallet: Wallet | null; onClose: () => void }) {
  const adjustment = useWalletAdjustment()
  const [targetBalance, setTargetBalance] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!wallet) return
    setTargetBalance(wallet.currentBalance)
    setNote('')
  }, [wallet])

  const difference = useMemo(() => {
    if (!wallet || targetBalance.trim() === '' || Number.isNaN(Number(targetBalance))) return null
    return Number(targetBalance) - parseDecimal(wallet.currentBalance)
  }, [targetBalance, wallet])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!wallet || targetBalance.trim() === '' || Number.isNaN(Number(targetBalance))) {
      toast.error('Ingresá un saldo válido')
      return
    }
    adjustment.mutate({ id: wallet.id, targetBalance: Number(targetBalance), note: note.trim() || undefined }, {
      onSuccess: () => { toast.success('Saldo ajustado'); onClose() },
      onError: (error) => toast.error(errorMessage(error)),
    })
  }

  return (
    <ResponsiveModal open={!!wallet} onOpenChange={(open) => !open && onClose()} title="Ajustar saldo" className="sm:max-w-md">
      <form id="wallet-adjustment" onSubmit={submit} className="flex flex-col gap-4 py-1">
        <p className="text-sm text-muted-foreground">Registrá el saldo real de <strong className="text-foreground">{wallet?.name}</strong>. Se guardará un movimiento de ajuste.</p>
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="text-muted-foreground">Saldo registrado</div>
          <div className="mt-1 font-semibold">$ {wallet && Number(wallet.currentBalance).toLocaleString('es-AR')}</div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adjustment-balance">Saldo real</Label>
          <Input id="adjustment-balance" type="number" inputMode="decimal" step="0.01" value={targetBalance} onChange={(e) => setTargetBalance(e.target.value)} autoFocus />
          {difference !== null && <p className="text-xs text-muted-foreground">Diferencia: {difference >= 0 ? '+' : ''}$ {difference.toLocaleString('es-AR')}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adjustment-note">Nota <span className="font-normal text-muted-foreground">(opcional)</span></Label>
          <Textarea id="adjustment-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Corrección de efectivo" className="resize-none" />
        </div>
      </form>
      <div className="flex justify-end gap-2.5 pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="wallet-adjustment" disabled={adjustment.isPending}>{adjustment.isPending ? 'Guardando...' : 'Confirmar ajuste'}</Button>
      </div>
    </ResponsiveModal>
  )
}
