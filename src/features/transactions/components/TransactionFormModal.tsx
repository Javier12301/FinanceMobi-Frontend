import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/config/api'
import { ResponsiveModal } from '@/components/elements/ResponsiveModal'
import { useWallets } from '@/features/wallets'
import { useCategories, type MovementType } from '@/features/categories'
import { dateInputToIso, isoToDateInput } from '@/utils/formatDate'
import { useTransactionModal } from '../useTransactionModal'
import { useCreateTransaction, useUpdateTransaction } from '../api/useTransactionMutations'

const TYPE_OPTIONS: { type: MovementType; label: string; icon: typeof ArrowUpRight; color: string }[] = [
  { type: 'EXPENSE', label: 'Gasto', icon: ArrowDownLeft, color: 'text-destructive border-destructive' },
  { type: 'INCOME', label: 'Ingreso', icon: ArrowUpRight, color: 'text-success border-success' },
  { type: 'TRANSFER', label: 'Transferencia', icon: ArrowLeftRight, color: 'text-muted-foreground border-muted-foreground' },
]

const todayInput = () => new Date().toISOString().slice(0, 10)

export function TransactionFormModal() {
  const { isOpen, editing, close } = useTransactionModal()
  const { data: wallets } = useWallets()
  const { data: categories } = useCategories()
  const create = useCreateTransaction()
  const update = useUpdateTransaction()

  const isEdit = !!editing
  const [step, setStep] = useState(1)
  const [type, setType] = useState<MovementType | null>(null)
  const [amount, setAmount] = useState('')
  const [walletId, setWalletId] = useState('')
  const [destinationWalletId, setDestinationWalletId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayInput())

  // Inicializa al abrir.
  useEffect(() => {
    if (!isOpen) return
    if (editing) {
      setStep(2)
      setType(editing.movementType)
      setAmount(editing.amount)
      setWalletId(editing.walletId)
      setDestinationWalletId(editing.destinationWalletId ?? '')
      setCategoryId(editing.categoryId)
      setDescription(editing.description ?? '')
      setDate(isoToDateInput(editing.date))
    } else {
      setStep(1)
      setType(null)
      setAmount('')
      setWalletId('')
      setDestinationWalletId('')
      setCategoryId('')
      setDescription('')
      setDate(todayInput())
    }
  }, [isOpen, editing])

  const filteredCategories = useMemo(
    () => categories?.filter((c) => c.movementType === type) ?? [],
    [categories, type],
  )

  const pending = create.isPending || update.isPending
  const isTransfer = type === 'TRANSFER'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const amountNum = Number(amount)
    if (!amountNum || amountNum <= 0) return toast.error('Ingresá un monto mayor a 0')
    if (!walletId) return toast.error('Elegí una billetera')
    if (isTransfer) {
      if (!destinationWalletId) return toast.error('Elegí la billetera destino')
      if (destinationWalletId === walletId) return toast.error('Origen y destino deben ser distintos')
    } else if (!categoryId) {
      return toast.error('Elegí una categoría')
    }

    const onError = (err: unknown) => toast.error(errorMessage(err))

    if (isEdit) {
      update.mutate(
        {
          id: editing.id,
          input: { amount: amountNum, categoryId, description: description || undefined, date: dateInputToIso(date) },
        },
        {
          onSuccess: () => {
            toast.success('Movimiento actualizado')
            close()
          },
          onError,
        },
      )
    } else {
      create.mutate(
        {
          walletId,
          categoryId,
          amount: amountNum,
          movementType: type!,
          date: dateInputToIso(date),
          description: description || undefined,
          destinationWalletId: isTransfer ? destinationWalletId : undefined,
        },
        {
          onSuccess: () => {
            toast.success(isTransfer ? 'Transferencia registrada' : 'Movimiento registrado')
            close()
          },
          onError,
        },
      )
    }
  }

  const stepLabel = step === 1 ? 'elegí el tipo' : 'completá los datos'

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      title={isEdit ? 'Editar movimiento' : 'Registrar movimiento'}
      description={`Paso ${step} — ${stepLabel}`}
      className="sm:max-w-lg"
    >
      {/* Paso 1: tipo */}
      {step === 1 && (
        <div className="flex flex-col gap-2.5 py-1">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => {
                setType(opt.type)
                setStep(2)
              }}
              className="flex items-center gap-3.5 rounded-xl border-2 p-4 text-left text-sm font-medium hover:bg-accent/40"
            >
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-full border-2', opt.color)}>
                <opt.icon size={18} />
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Paso 2: datos */}
      {step === 2 && type && (
        <form id="txn-form" onSubmit={submit} className="flex flex-col gap-3 py-1">
          <div className="rounded-xl bg-surface p-4 text-center">
            <div className="mb-1 text-xs text-muted-foreground">Monto</div>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent text-center text-3xl font-semibold outline-none"
              autoFocus
            />
          </div>

          {isTransfer ? (
            <>
              <Field label="Desde">
                <WalletSelect wallets={wallets} value={walletId} onChange={setWalletId} />
              </Field>
              <Field label="Hacia">
                <WalletSelect wallets={wallets} value={destinationWalletId} onChange={setDestinationWalletId} />
              </Field>
            </>
          ) : (
            <>
              <Field label="Billetera">
                <WalletSelect wallets={wallets} value={walletId} onChange={setWalletId} disabled={isEdit} />
              </Field>
              <Field label="Categoría">
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegí una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="t-desc">
              Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Compra semanal" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-date">Fecha</Label>
            <Input id="t-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {!isTransfer && !isEdit && (
            <div className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              <Paperclip size={16} />
              <span>Adjuntar comprobante — próximamente</span>
            </div>
          )}
        </form>
      )}

      {step === 2 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          {!isEdit ? (
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              ← Atrás
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" form="txn-form" disabled={pending}>
              {pending ? 'Guardando…' : isTransfer ? 'Transferir' : 'Registrar'}
            </Button>
          </div>
        </div>
      )}
    </ResponsiveModal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function WalletSelect({
  wallets,
  value,
  onChange,
  disabled,
}: {
  wallets: { id: string; name: string }[] | undefined
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Elegí una billetera" />
      </SelectTrigger>
      <SelectContent>
        {wallets?.map((w) => (
          <SelectItem key={w.id} value={w.id}>
            {w.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
