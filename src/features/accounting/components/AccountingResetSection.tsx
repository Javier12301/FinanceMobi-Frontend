import { useState } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/elements/ResponsiveModal'
import { api, errorMessage } from '@/config/api'
import { clearOutboxForOwner } from '@/features/offline'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useWalletModal, useWallets } from '@/features/wallets'
import { PostResetWalletSetup } from '@/features/wallets/components/PostResetWalletSetup'

type WalletStrategy = 'KEEP' | 'DELETE'

export function AccountingResetSection() {
  const queryClient = useQueryClient()
  const selfId = useOwnerStore((state) => state.selfId)
  const activeOwnerId = useOwnerStore((state) => state.activeOwnerId)
  const { data: wallets } = useWallets()
  const openWalletModal = useWalletModal((state) => state.open)
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [strategy, setStrategy] = useState<WalletStrategy>('KEEP')
  const [setupWallets, setSetupWallets] = useState<null | typeof wallets>(null)
  const reset = useMutation({
    mutationFn: async (walletStrategy: WalletStrategy) => {
      const { data } = await api.post('/accounting/reset', { walletStrategy, requestId: crypto.randomUUID() })
      return data
    },
    onSuccess: async (_result, walletStrategy) => {
      if (!activeOwnerId) return
      await clearOutboxForOwner(activeOwnerId)
      queryClient.removeQueries({ predicate: (query) => query.queryKey.includes(activeOwnerId) })
      await queryClient.invalidateQueries()
      if (walletStrategy === 'KEEP') {
        const refreshed = await queryClient.fetchQuery({ queryKey: ['wallets', activeOwnerId], queryFn: async () => (await api.get('/wallets')).data })
        setSetupWallets(refreshed)
      } else {
        openWalletModal()
      }
      setStep(0)
      toast.success('Datos contables reiniciados')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (!selfId || activeOwnerId !== selfId) return null
  const finishSetup = () => { setSetupWallets(null); void queryClient.invalidateQueries() }
  return (
    <>
      <section>
        <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Datos contables</div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-destructive/30 bg-card p-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Reiniciar datos contables</div>
            <p className="mt-1 text-xs text-muted-foreground">Elimina movimientos, deudas, presupuestos y recurrentes. Tu perfil, categorías, rachas y permisos permanecen.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setStep(1)}><RotateCcw size={15} /> Reiniciar</Button>
        </div>
      </section>

      <ResponsiveModal open={step === 1} onOpenChange={(open) => !open && setStep(0)} title="Reiniciar datos contables" className="sm:max-w-md">
        <div className="flex flex-col gap-3 py-1 text-sm">
          <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive"><AlertTriangle className="mt-0.5 shrink-0" size={18} /><p>Esta acción elimina de forma permanente todos tus movimientos y datos contables asociados.</p></div>
          <p className="text-muted-foreground">No se eliminan tu cuenta, categorías, rachas, permisos ni preferencias.</p>
        </div>
        <div className="flex justify-end gap-2.5 pt-2"><Button variant="outline" onClick={() => setStep(0)}>Cancelar</Button><Button variant="destructive" onClick={() => setStep(2)}>Continuar</Button></div>
      </ResponsiveModal>

      <ResponsiveModal open={step === 2} onOpenChange={(open) => !open && setStep(0)} title="¿Qué hacemos con tus billeteras?" className="sm:max-w-md">
        <div className="flex flex-col gap-2 py-1">
          <button type="button" onClick={() => setStrategy('KEEP')} className={`rounded-lg border p-3 text-left text-sm ${strategy === 'KEEP' ? 'border-primary bg-primary-soft' : 'hover:bg-accent/50'}`}><strong>Conservar billeteras</strong><span className="mt-1 block text-xs text-muted-foreground">Se mantienen, pero con saldo inicial y actual en $0.</span></button>
          <button type="button" onClick={() => setStrategy('DELETE')} className={`rounded-lg border p-3 text-left text-sm ${strategy === 'DELETE' ? 'border-primary bg-primary-soft' : 'hover:bg-accent/50'}`}><strong>Eliminar todas las billeteras</strong><span className="mt-1 block text-xs text-muted-foreground">Podrás crear una nueva al terminar.</span></button>
        </div>
        <div className="flex justify-end gap-2.5 pt-2"><Button variant="outline" onClick={() => setStep(1)}>Atrás</Button><Button variant="destructive" onClick={() => reset.mutate(strategy)} disabled={reset.isPending}>{reset.isPending ? 'Reiniciando...' : 'Confirmar reinicio'}</Button></div>
      </ResponsiveModal>
      {setupWallets && <PostResetWalletSetup wallets={setupWallets} onFinish={finishSetup} />}
    </>
  )
}
