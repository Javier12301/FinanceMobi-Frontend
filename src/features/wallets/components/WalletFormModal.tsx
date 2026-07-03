import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/config/api'
import { ResponsiveModal } from '@/components/elements/ResponsiveModal'
import { useWalletModal } from '../useWalletModal'
import { useWalletTypes } from '../api/useWalletTypes'
import { useCreateWallet, useUpdateWallet } from '../api/useWalletMutations'
import { walletTypeMeta } from '../walletTypeMeta'

/** Modal global de creación/edición de billeteras (controlado por useWalletModal). */
export function WalletFormModal() {
  const { isOpen, editing, close } = useWalletModal()
  const { data: types } = useWalletTypes()
  const create = useCreateWallet()
  const update = useUpdateWallet()

  const [name, setName] = useState('')
  const [typeId, setTypeId] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [initialBalance, setInitialBalance] = useState('')

  // Sincroniza el form al abrir.
  useEffect(() => {
    if (!isOpen) return
    setName(editing?.name ?? '')
    setTypeId(editing?.typeId ?? types?.[0]?.id ?? null)
    setDescription(editing?.description ?? '')
    setInitialBalance(editing ? editing.initialBalance : '')
  }, [isOpen, editing, types])

  const isEdit = !!editing
  const pending = create.isPending || update.isPending

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Ingresá un nombre')
    if (typeId == null) return toast.error('Elegí un tipo')

    const onError = (err: unknown) => toast.error(errorMessage(err))

    if (isEdit) {
      const initialChanged = initialBalance !== '' && Number(initialBalance) !== Number(editing.initialBalance)
      update.mutate(
        {
          id: editing.id,
          input: {
            name,
            typeId,
            description: description || undefined,
            ...(initialChanged ? { initialBalance: Number(initialBalance) } : {}),
          },
        },
        {
          onSuccess: () => {
            toast.success('Billetera actualizada')
            close()
          },
          onError,
        },
      )
    } else {
      create.mutate(
        { name, typeId, description: description || undefined, initialBalance: Number(initialBalance) || 0 },
        {
          onSuccess: () => {
            toast.success('Billetera creada')
            close()
          },
          onError,
        },
      )
    }
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      title={isEdit ? 'Editar billetera' : 'Nueva billetera'}
      className="sm:max-w-lg"
    >
      <form id="wallet-form" onSubmit={onSubmit} className="flex flex-col gap-4 py-1">
        <div className="space-y-1.5">
          <Label htmlFor="w-name">Nombre</Label>
          <Input id="w-name" placeholder="Ej: Caja diaria" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Tipo</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {types?.map((t) => {
              const meta = walletTypeMeta(t.name)
              const active = typeId === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeId(t.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'text-muted-foreground hover:bg-accent/50',
                  )}
                >
                  <meta.icon size={18} />
                  {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="w-desc">
            Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Textarea
            id="w-desc"
            rows={2}
            placeholder="Ej: Dinero para gastos diarios"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="w-balance">Saldo inicial</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              id="w-balance"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              className="pl-7"
            />
          </div>
          {isEdit && (
            <p className="text-xs text-muted-foreground">
              Si te equivocaste al cargarlo, corregilo acá. El saldo actual se ajusta por la misma diferencia.
            </p>
          )}
        </div>
      </form>

      <div className="flex justify-end gap-2.5 pt-2">
        <Button variant="outline" onClick={close}>
          Cancelar
        </Button>
        <Button type="submit" form="wallet-form" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </ResponsiveModal>
  )
}
