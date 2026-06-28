import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, Plus } from 'lucide-react'
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
import { useWallets } from '@/features/wallets'
import {
  useCategories,
  useCreateCategory,
  categoryMeta,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  type MovementType,
} from '@/features/categories'
import { useCreateRecurringRule } from '@/features/recurring'
import { dateInputToIso, isoToDateInput, dateToInput } from '@/utils/formatDate'
import { useTransactionModal } from '../useTransactionModal'
import { useCreateTransaction, useUpdateTransaction } from '../api/useTransactionMutations'
import { getLastUsed, setLastUsed } from '../lastUsed'

const TYPE_OPTIONS: { type: MovementType; label: string; icon: typeof ArrowUpRight; active: string }[] = [
  { type: 'EXPENSE', label: 'Gasto', icon: ArrowDownLeft, active: 'border-destructive bg-destructive/10 text-destructive' },
  { type: 'INCOME', label: 'Ingreso', icon: ArrowUpRight, active: 'border-success bg-success/10 text-success' },
  { type: 'TRANSFER', label: 'Transferencia', icon: ArrowLeftRight, active: 'border-primary bg-primary-soft text-primary' },
]

const todayInput = () => dateToInput(new Date())
const yesterdayInput = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return dateToInput(d)
}

export function TransactionFormModal() {
  const { isOpen, editing, duplicateFrom, close } = useTransactionModal()
  const { data: wallets } = useWallets()
  const { data: categories } = useCategories()
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
      const last = getLastUsed('EXPENSE')
      setType('EXPENSE')
      setAmount('')
      setWalletId(last.walletId ?? '')
      setDestinationWalletId('')
      setCategoryId(last.categoryId ?? '')
      setDescription('')
      setDate(todayInput())
    }
    setRepeat(false)
    setAutoPost(false)
  }, [isOpen, editing, duplicateFrom])

  // Al cambiar de tipo en un alta limpia, aplica los defaults recordados de ese tipo.
  const onChangeType = (t: MovementType) => {
    setType(t)
    if (!isEdit) {
      const last = getLastUsed(t)
      setWalletId(last.walletId ?? '')
      setCategoryId(last.categoryId ?? '')
    }
  }

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
    >
      <form id="txn-form" onSubmit={submit} className="flex flex-col gap-3 py-1">
        {/* Tipo (chips). En edición no se puede cambiar el tipo. */}
        {!isEdit && (
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => onChangeType(opt.type)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border-2 py-2.5 text-xs font-medium transition-colors',
                  type === opt.type ? opt.active : 'border-transparent bg-surface text-muted-foreground',
                )}
              >
                <opt.icon size={18} />
                {opt.label}
              </button>
            ))}
          </div>
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
              <WalletSelect wallets={wallets} value={walletId} onChange={setWalletId} disabled={isEdit} />
            </Field>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <CategoryGrid
                categories={filteredCategories}
                value={categoryId}
                onChange={setCategoryId}
                movementType={type}
                onCreated={setCategoryId}
              />
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

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="outline" onClick={close}>
          Cancelar
        </Button>
        <Button type="submit" form="txn-form" disabled={pending}>
          {pending ? 'Guardando…' : isTransfer ? 'Transferir' : 'Registrar'}
        </Button>
      </div>
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

/** Grilla de íconos de categoría (1 toque) + crear inline. */
function CategoryGrid({
  categories,
  value,
  onChange,
  movementType,
  onCreated,
}: {
  categories: import('@/features/categories').Category[]
  value: string
  onChange: (id: string) => void
  movementType: MovementType
  onCreated: (id: string) => void
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('tag')
  const [color, setColor] = useState(CATEGORY_COLORS[0])
  const createCategory = useCreateCategory()

  const onCreate = () => {
    if (!name.trim()) return
    createCategory.mutate(
      { name: name.trim(), movementType, icon, color },
      {
        onSuccess: (cat) => {
          onCreated(cat.id)
          setName('')
          setIcon('tag')
          setColor(CATEGORY_COLORS[0])
          setCreating(false)
          toast.success('Categoría creada')
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    )
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {categories.map((c) => {
          const meta = categoryMeta(c)
          const selected = c.id === value
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-medium',
                selected ? 'border-primary bg-primary-soft' : 'border-border',
              )}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: meta.color + '22', color: meta.color }}
              >
                {selected ? <Check size={18} /> : <meta.icon size={18} />}
              </span>
              <span className="line-clamp-1 w-full text-center">{c.name}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="flex flex-col items-center gap-1 rounded-xl border border-dashed p-2 text-[11px] font-medium text-muted-foreground"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface">
            <Plus size={18} />
          </span>
          Nueva
        </button>
      </div>

      {creating && (
        <div className="space-y-2.5 rounded-xl border bg-surface p-3">
          <div className="flex gap-2">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la categoría"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onCreate()
                }
              }}
            />
            <Button type="button" onClick={onCreate} disabled={createCategory.isPending}>
              Crear
            </Button>
          </div>

          {/* Ícono */}
          <div className="grid grid-cols-7 gap-1.5">
            {Object.entries(CATEGORY_ICONS).map(([k, Icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => setIcon(k)}
                className={cn(
                  'flex h-8 items-center justify-center rounded-lg border transition-colors',
                  icon === k
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>

          {/* Color */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn('h-6 w-6 rounded-full border-2', color === c ? 'border-foreground' : 'border-transparent')}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
