import { useMemo, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, Delete, Plus, X } from 'lucide-react'
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
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { errorMessage, isNotAvailable } from '@/config/api'
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
import { useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '../api/useTransactionMutations'
import { getLastUsed, setLastUsed } from '../lastUsed'
import { useEffect } from 'react'

const TYPE_OPTIONS: { type: MovementType; label: string; icon: typeof ArrowUpRight; active: string }[] = [
  { type: 'EXPENSE', label: 'Gasto', icon: ArrowDownLeft, active: 'border-destructive bg-destructive/10 text-destructive' },
  { type: 'INCOME', label: 'Ingreso', icon: ArrowUpRight, active: 'border-success bg-success/10 text-success' },
  { type: 'TRANSFER', label: 'Transf.', icon: ArrowLeftRight, active: 'border-primary bg-primary-soft text-primary' },
]

const todayInput = () => dateToInput(new Date())
const yesterdayInput = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return dateToInput(d)
}

// ── Numpad ────────────────────────────────────────────────────────────────────
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'] as const
type NumKey = (typeof KEYS)[number]

function Numpad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const handleKey = (key: NumKey) => {
    if (key === '⌫') {
      onChange(value.slice(0, -1))
      return
    }
    if (key === '.' && value.includes('.')) return
    // max 2 decimals
    const dotIdx = value.indexOf('.')
    if (dotIdx !== -1 && value.length - dotIdx > 2) return
    // max length
    if (value.replace('.', '').length >= 10) return
    // prevent leading zeros like "007"
    if (value === '0' && key !== '.') {
      onChange(key)
      return
    }
    onChange(value + key)
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 px-3 pb-2 pt-1">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onPointerDown={(e) => {
            e.preventDefault() // prevent focus steal
            handleKey(key)
          }}
          className={cn(
            'flex h-12 items-center justify-center rounded-xl text-lg font-semibold transition-colors active:scale-95',
            key === '⌫'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-surface text-foreground hover:bg-muted',
          )}
        >
          {key === '⌫' ? <Delete size={20} /> : key}
        </button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function TransactionMobileForm() {
  const { isOpen, editing, duplicateFrom, close } = useTransactionModal()
  const { data: wallets } = useWallets()
  const { data: categories } = useCategories()
  const create = useCreateTransaction()
  const update = useUpdateTransaction()
  const createRule = useCreateRecurringRule()
  const delete_ = useDeleteTransaction()

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

  // reset on open
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
      setDate(editing ? isoToDateInput(source.date) : todayInput())
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

  const displayAmount = amount === '' ? '0' : amount

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
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
      // Sin red la mutación queda pausada (React Query la reenvía al reconectar). El update
      // optimista ya muestra el movimiento, así que offline cerramos y avisamos al instante
      // en vez de esperar al onSuccess (que recién corre al volver la conexión).
      const offline = !navigator.onLine
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
          onSuccess: (txn) => {
            const msg = isTransfer ? 'Transferencia registrada' : 'Movimiento registrado'
            // ponytail: deshacer = borrar la txn recién creada (4s window)
            toast.success(msg, {
              action: {
                label: 'Deshacer',
                onClick: () => delete_.mutate(txn.id),
              },
              duration: 4000,
            })
            if (!offline) {
              if (repeat) createRecurringFrom(amountNum)
              close()
            }
          },
          onError,
        },
      )
      setLastUsed(type, { walletId, categoryId: isTransfer ? undefined : categoryId })
      if (offline) {
        if (repeat) createRecurringFrom(amountNum)
        toast.success('Guardado sin conexión. Se subirá al reconectar.')
        close()
      }
    }
  }

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

  // color accent del monto según tipo
  const amountColor =
    type === 'EXPENSE'
      ? 'text-destructive'
      : type === 'INCOME'
        ? 'text-success'
        : 'text-primary'

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && close()}>
      {/*
        Layout de 3 zonas:
          1. Header fijo (tipo + billetera)
          2. Contenido scrollable (categorías, descripción, fecha, repetir)
          3. Footer fijo (display de monto + numpad + botones)
      */}
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="flex h-[96dvh] flex-col gap-0 rounded-t-2xl p-0"
      >
        {/* ── Zona 1: Header fijo ─────────────────────────────────── */}
        <div className="shrink-0 px-4 pb-2 pt-4">
          {/* Título + cerrar */}
          <div className="mb-3 flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">
              {isEdit ? 'Editar movimiento' : 'Registrar movimiento'}
            </SheetTitle>
            <button
              type="button"
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tipo (chips) */}
          {!isEdit && (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => onChangeType(opt.type)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl border-2 py-2 text-xs font-semibold transition-colors',
                    type === opt.type
                      ? opt.active
                      : 'border-transparent bg-surface text-muted-foreground',
                  )}
                >
                  <opt.icon size={15} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Billetera(s) */}
          {isTransfer ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Desde</Label>
                <WalletSelect wallets={wallets} value={walletId} onChange={setWalletId} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hacia</Label>
                <WalletSelect wallets={wallets} value={destinationWalletId} onChange={setDestinationWalletId} />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Billetera</Label>
              <WalletSelect wallets={wallets} value={walletId} onChange={setWalletId} disabled={isEdit} />
            </div>
          )}
        </div>

        {/* ── Zona 2: Contenido scrollable ────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
          {/* Categorías */}
          {!isTransfer && (
            <div className="mb-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Categoría</Label>
              <CategoryGrid
                categories={filteredCategories}
                value={categoryId}
                onChange={setCategoryId}
                movementType={type}
                onCreated={setCategoryId}
              />
            </div>
          )}

          {/* Descripción */}
          <div className="mb-3 space-y-1.5">
            <Label htmlFor="tm-desc" className="text-xs text-muted-foreground">
              Descripción <span className="font-normal">(opcional)</span>
            </Label>
            <Input
              id="tm-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Compra semanal"
            />
          </div>

          {/* Fecha */}
          <div className="mb-3 space-y-1.5">
            <Label htmlFor="tm-date" className="text-xs text-muted-foreground">Fecha</Label>
            <div className="flex gap-2">
              <DateChip label="Hoy" active={date === todayInput()} onClick={() => setDate(todayInput())} />
              <DateChip label="Ayer" active={date === yesterdayInput()} onClick={() => setDate(yesterdayInput())} />
              <Input id="tm-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1" />
            </div>
          </div>

          {/* Repetir */}
          {!isEdit && (
            <div className="mb-2 rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="tm-repeat" className="font-medium">
                  Repetir cada mes
                  <span className="block text-xs font-normal text-muted-foreground">
                    Día {Number(date.slice(8, 10))} de cada mes
                  </span>
                </Label>
                <Switch id="tm-repeat" checked={repeat} onCheckedChange={setRepeat} />
              </div>
              {repeat && (
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <Label htmlFor="tm-auto" className="font-normal text-muted-foreground">
                    Cargar automáticamente
                  </Label>
                  <Switch id="tm-auto" checked={autoPost} onCheckedChange={setAutoPost} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Zona 3: Footer fijo (monto + numpad + acción) ───────── */}
        <div className="shrink-0 border-t bg-background">
          {/* Display de monto */}
          <div className="px-4 pt-3 text-center">
            <span className="text-xs font-medium text-muted-foreground">Monto</span>
            <div className={cn('text-4xl font-bold tracking-tight transition-colors', amountColor)}>
              ${displayAmount}
            </div>
          </div>

          {/* Montos sugeridos */}
          <div className="px-3 py-2 flex gap-1.5 justify-center">
            {[1000, 5000, 10000].map((sug) => (
              <button
                key={sug}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault()
                  setAmount(String(sug))
                }}
                className="min-h-11 flex-1 rounded-lg border border-primary bg-primary-soft px-2.5 text-sm font-medium text-primary transition-colors active:scale-95"
              >
                ${sug.toLocaleString('es-AR')}
              </button>
            ))}
          </div>

          {/* Numpad */}
          <Numpad value={amount} onChange={setAmount} />

          {/* Botón de acción */}
          <div className="px-3 pb-4">
            <Button
              type="button"
              onClick={() => submit()}
              disabled={pending}
              className="h-12 w-full rounded-xl text-base font-semibold"
            >
              {pending ? 'Guardando…' : isTransfer ? 'Transferir' : isEdit ? 'Guardar cambios' : 'Registrar movimiento'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
                'flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-medium transition-colors',
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
