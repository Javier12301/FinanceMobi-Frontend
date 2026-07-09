import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { errorMessage, isNotAvailable } from '@/config/api'
import { ResponsiveModal } from '@/components/elements/ResponsiveModal'
import { TypeSegment, type TypeSegmentOption } from '@/components/elements/TypeSegment'
import { useWallets } from '@/features/wallets'
import {
  CategoryPicker,
  type MovementType,
} from '@/features/categories'
import { useCreateRecurringRule, RecurringBanner } from '@/features/recurring'
import { dateInputToIso, isoToDateInput, dateToInput } from '@/utils/formatDate'
import { useTransactionModal } from '../useTransactionModal'
import { useCreateTransaction, useUpdateTransaction } from '../api/useTransactionMutations'
import { getLastUsed, setLastUsed } from '../lastUsed'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { TransactionMobileForm } from './TransactionMobileForm'

const TYPE_OPTIONS: TypeSegmentOption<MovementType>[] = [
  { value: 'EXPENSE', label: 'Gasto', icon: ArrowDownLeft, activeClass: 'border-destructive bg-destructive/10 text-destructive' },
  { value: 'INCOME', label: 'Ingreso', icon: ArrowUpRight, activeClass: 'border-success bg-success/10 text-success' },
  { value: 'TRANSFER', label: 'Transferencia', icon: ArrowLeftRight, activeClass: 'border-primary bg-primary-soft text-primary' },
]

const todayInput = () => dateToInput(new Date())
const yesterdayInput = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return dateToInput(d)
}

export function TransactionFormModal() {
  const isDesktop = useIsDesktop()

  // En mobile usamos el formulario con numpad custom (sin teclado nativo)
  if (!isDesktop) return <TransactionMobileForm />

  return <TransactionFormDesktop />
}

function TransactionFormDesktop() {
  const { isOpen, editing, duplicateFrom, defaults, close } = useTransactionModal()
  const { data: wallets } = useWallets()
  const create = useCreateTransaction()
  const update = useUpdateTransaction()
  const createRule = useCreateRecurringRule()

  const isEdit = !!editing
  const [type, setType] = useState<MovementType>('EXPENSE')
  const [amount, setAmount] = useState('')
  const [walletId, setWalletId] = useState('')
  const [destinationWalletId, setDestinationWalletId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayInput())
  const [repeat, setRepeat] = useState(false)
  const [autoPost, setAutoPost] = useState(false)

  // Inicializa al abrir: edición, duplicado o alta limpia (gasto por defecto + defaults recordados).
  useEffect(() => {
    if (!isOpen) return
    const source = editing ?? duplicateFrom
    if (source) {
      const t = source.movementType
      setType(t)
      setAmount(source.amount)
      setWalletId(source.walletId)
      setDestinationWalletId(source.destinationWalletId ?? '')
      setCategoryId(source.categoryId)
      setDescription(source.description ?? '')
      setDate(editing ? isoToDateInput(source.date) : todayInput()) // duplicar => hoy
    } else {
      const dType = defaults?.movementType ?? 'EXPENSE'
      const last = getLastUsed(dType)
      setType(dType)
      setAmount('')
      setWalletId(last.walletId ?? '')
      setDestinationWalletId('')
      setCategoryId(last.categoryId ?? '')
      setDescription('')
      setDate(todayInput())
    }
    setRepeat(defaults?.repeat ?? false)
    setAutoPost(false)
  }, [isOpen, editing, duplicateFrom, defaults])

  // Al cambiar de tipo en un alta limpia, aplica los defaults recordados de ese tipo.
  const onChangeType = (t: MovementType) => {
    setType(t)
    if (!isEdit) {
      const last = getLastUsed(t)
      setWalletId(last.walletId ?? '')
      setCategoryId(last.categoryId ?? '')
    }
  }

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
          original: editing,
          input: {
            amount: amountNum,
            categoryId,
            description: description || undefined,
            // Solo mandar date si el día cambió: dateInputToIso estampa la hora ACTUAL, así que
            // reenviarlo sin cambios pisaría la hora original del movimiento.
            ...(date !== isoToDateInput(editing.date) ? { date: dateInputToIso(date) } : {}),
            walletId,
            ...(isTransfer ? { destinationWalletId } : {}),
          },
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
          movementType: type,
          date: dateInputToIso(date),
          description: description || undefined,
          destinationWalletId: isTransfer ? destinationWalletId : undefined,
        },
        {
          onSuccess: () => {
            setLastUsed(type, { walletId, categoryId: isTransfer ? undefined : categoryId })
            toast.success(isTransfer ? 'Transferencia registrada' : 'Movimiento registrado')
            if (repeat) createRecurringFrom(amountNum)
            close()
          },
          onError,
        },
      )
    }
  }

  // Crea la regla recurrente a partir del movimiento recién cargado.
  // ponytail: si el backend aún no expone /recurring-rules (404/501), no molesta: el movimiento ya se guardó.
  const createRecurringFrom = (amountNum: number) => {
    createRule.mutate(
      {
        walletId,
        categoryId,
        movementType: type,
        amount: amountNum,
        description: description || undefined,
        dayOfMonth: Number(date.slice(8, 10)),
        autoPost,
        destinationWalletId: isTransfer ? destinationWalletId : undefined,
        startDate: dateInputToIso(date),
      },
      {
        onSuccess: () => toast.success('Se repetirá cada mes'),
        onError: (err) => {
          if (!isNotAvailable(err)) toast.error(errorMessage(err))
        },
      },
    )
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      title={isEdit ? 'Editar movimiento' : 'Registrar movimiento'}
      className="sm:max-w-lg"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" form="txn-form" disabled={pending}>
            {pending ? 'Guardando…' : isTransfer ? 'Transferir' : 'Registrar'}
          </Button>
        </div>
      }
    >
      <form id="txn-form" onSubmit={submit} className="flex flex-col gap-3 py-1">
        {isEdit && editing?.recurringRuleId && (
          <RecurringBanner ruleId={editing.recurringRuleId} onDone={close} />
        )}

        {/* Tipo (chips). En edición no se puede cambiar el tipo. */}
        {!isEdit && (
          <TypeSegment options={TYPE_OPTIONS} value={type} onChange={onChangeType} />
        )}

        {/* Monto */}
        <div className="rounded-xl bg-surface p-4 text-center">
          <div className="mb-1 text-xs text-muted-foreground">Monto</div>
          <input
            type="number"
            inputMode="decimal"
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
              <WalletSelect wallets={wallets} value={walletId} onChange={setWalletId} />
            </Field>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <CategoryPicker movementType={type} value={categoryId} onChange={setCategoryId} />
            </div>
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
          <div className="flex gap-2">
            <DateChip label="Hoy" active={date === todayInput()} onClick={() => setDate(todayInput())} />
            <DateChip label="Ayer" active={date === yesterdayInput()} onClick={() => setDate(yesterdayInput())} />
            <Input id="t-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1" />
          </div>
        </div>

        {/* Repetir cada mes (solo en alta) */}
        {!isEdit && (
          <div className="rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="t-repeat" className="font-medium">
                Repetir cada mes
                <span className="block text-xs font-normal text-muted-foreground">
                  Día {Number(date.slice(8, 10))} de cada mes
                </span>
              </Label>
              <Switch id="t-repeat" checked={repeat} onCheckedChange={setRepeat} />
            </div>
            {repeat && (
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <Label htmlFor="t-auto" className="font-normal text-muted-foreground">
                  Cargar automáticamente (sin confirmar)
                </Label>
                <Switch id="t-auto" checked={autoPost} onCheckedChange={setAutoPost} />
              </div>
            )}
          </div>
        )}

        {!isTransfer && !isEdit && (
          <p className="text-xs text-muted-foreground">
            Podés adjuntar comprobantes desde el detalle del movimiento una vez registrado.
          </p>
        )}
      </form>
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

function DateChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 text-sm font-medium',
        active ? 'border-primary bg-primary-soft text-primary' : 'text-muted-foreground',
      )}
    >
      {label}
    </button>
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

