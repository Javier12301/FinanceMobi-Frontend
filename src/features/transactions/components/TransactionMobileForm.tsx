import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Delete, X } from 'lucide-react'
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
import { TypeSegment, type TypeSegmentOption } from '@/components/elements/TypeSegment'
import { errorMessage, isNotAvailable } from '@/config/api'
import { useWallets } from '@/features/wallets'
import {
  CompactCategoryRow,
  type MovementType,
} from '@/features/categories'
import { useCreateRecurringRule, RecurringBanner } from '@/features/recurring'
import { dateInputToIso, isoToDateInput, dateToInput } from '@/utils/formatDate'
import { useTransactionModal } from '../useTransactionModal'
import { useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '../api/useTransactionMutations'
import { getLastUsed, setLastUsed } from '../lastUsed'

const TYPE_OPTIONS: TypeSegmentOption<MovementType>[] = [
  { value: 'EXPENSE', label: 'Gasto', icon: ArrowDownLeft, activeClass: 'border-destructive bg-destructive/10 text-destructive' },
  { value: 'INCOME', label: 'Ingreso', icon: ArrowUpRight, activeClass: 'border-success bg-success/10 text-success' },
  { value: 'TRANSFER', label: 'Transf.', icon: ArrowLeftRight, activeClass: 'border-primary bg-primary-soft text-primary' },
]

// ponytail: clases del bottom sheet full-screen en mobile chico; compartidas con el detalle de deuda
export const FULLSCREEN_SHEET_CLASS =
  'max-[360px]:h-[100dvh] max-[360px]:rounded-none [@media(max-height:780px)]:h-[100dvh] [@media(max-height:780px)]:rounded-none'

const todayInput = () => dateToInput(new Date())
const yesterdayInput = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return dateToInput(d)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatWalletDisplay(
  type: MovementType,
  walletId: string,
  destinationWalletId: string,
  wallets: { id: string; name: string }[] | undefined,
): string {
  if (type === 'TRANSFER') {
    const from = wallets?.find((w) => w.id === walletId)?.name
    const to = wallets?.find((w) => w.id === destinationWalletId)?.name
    if (from && to) return `${from} → ${to}`
    return from ? `${from} →` : 'Origen'
  }
  return wallets?.find((w) => w.id === walletId)?.name || 'Seleccionar billetera'
}

function formatDateShort(dateInput: string): string {
  if (dateInput === todayInput()) return 'Hoy'
  if (dateInput === yesterdayInput()) return 'Ayer'
  const [, m, d] = dateInput.split('-')
  return `${d}/${m}`
}

function formatRepeatShort(repeat: boolean): string {
  return repeat ? 'Mensual' : 'Una vez'
}

// ── Numpad ────────────────────────────────────────────────────────────────────
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'] as const
type NumKey = (typeof KEYS)[number]

type ContextField = 'wallet' | 'date' | 'repeat'

// ── SummaryBar (3 celdas → cada una abre su propio selector) ────────────────────
function SummaryBar({
  type,
  walletId,
  destinationWalletId,
  wallets,
  date,
  repeat,
  onOpen,
}: {
  type: MovementType
  walletId: string
  destinationWalletId: string
  wallets: { id: string; name: string }[] | undefined
  date: string
  repeat: boolean
  onOpen: (field: ContextField) => void
}) {
  // ponytail: celda compacta reutilizable; min-h por altura, no por ancho, para no comer 110px en 320x568
  const cellClass =
    'flex flex-col gap-0.5 rounded-md bg-background p-2 text-left text-xs transition-colors hover:bg-muted min-h-[50px] [@media(max-height:640px)]:min-h-0 [@media(max-height:640px)]:p-1.5'
  return (
    <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg border border-border bg-card p-2.5 max-[360px]:grid-cols-2 max-[360px]:gap-1.5 [@media(max-height:640px)]:mb-1.5 [@media(max-height:640px)]:p-1.5 [@media(max-height:640px)]:gap-1">
      {/* Celda 1: Billetera(s) */}
      <button type="button" onClick={() => onOpen('wallet')} className={cellClass}>
        <span className="font-semibold text-foreground">{type === 'TRANSFER' ? 'Origen' : 'Billetera'}</span>
        <span className="text-muted-foreground text-[10px] line-clamp-2">
          {formatWalletDisplay(type, walletId, destinationWalletId, wallets)}
        </span>
      </button>

      {/* Celda 2: Fecha */}
      <button type="button" onClick={() => onOpen('date')} className={cellClass}>
        <span className="font-semibold text-foreground">Fecha</span>
        <span className="text-muted-foreground text-[10px]">{formatDateShort(date)}</span>
      </button>

      {/* Celda 3: Repetir */}
      <button type="button" onClick={() => onOpen('repeat')} className={cellClass}>
        <span className="font-semibold text-foreground">Repetir</span>
        <span className="text-muted-foreground text-[10px]">{formatRepeatShort(repeat)}</span>
      </button>

      {/* En <360px, fila extra para destino si es transferencia */}
      {type === 'TRANSFER' && (
        <button type="button" onClick={() => onOpen('wallet')} className={cn(cellClass, 'col-span-2 max-[360px]:col-span-1')}>
          <span className="font-semibold text-foreground">Destino</span>
          <span className="text-muted-foreground text-[10px] line-clamp-2">
            {wallets?.find((w) => w.id === destinationWalletId)?.name || 'Seleccionar'}
          </span>
        </button>
      )}
    </div>
  )
}

// ── Numpad ────────────────────────────────────────────────────────────────────
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
    <div className="grid grid-cols-3 gap-2 px-3 py-2 [@media(max-height:640px)]:gap-1 [@media(max-height:640px)]:px-2 [@media(max-height:640px)]:py-0.5">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onPointerDown={(e) => {
            e.preventDefault() // ponytail: prevent native keyboard focus
            handleKey(key)
          }}
          className={cn(
            'flex items-center justify-center rounded-lg text-lg font-semibold transition-colors active:scale-95 h-12 [@media(max-height:640px)]:h-8 [@media(max-height:640px)]:text-sm',
            key === '⌫'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-surface text-foreground hover:bg-muted',
          )}
        >
          {key === '⌫' ? <Delete size={18} className="[@media(max-height:640px)]:size-4" /> : key}
        </button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function TransactionMobileForm() {
  const { isOpen, editing, duplicateFrom, defaults, close } = useTransactionModal()
  const { data: wallets } = useWallets()
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
  const [sheet, setSheet] = useState<ContextField | null>(null)

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

  const displayAmount = amount === '' ? '0' : amount

  // ponytail: Validación para disabled del CTA
  const amountNum = Number(amount)
  const isAmountValid = amountNum > 0
  const isWalletValid = !!walletId
  const isTransferValid = isTransfer ? !!destinationWalletId && destinationWalletId !== walletId : true
  const isCategoryValid = isTransfer || !!categoryId
  const canSubmit = isAmountValid && isWalletValid && isTransferValid && isCategoryValid && !pending

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
        Nuevo layout amount-first:
          1. Header fijo: título, cerrar, tipo, barra resumen
          2. Contenido scrollable: accordion colapsado (detalles)
          3. Footer fijo: monto, montos rápidos, keypad, CTA
      */}
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className={cn('flex h-[96dvh] flex-col gap-0 rounded-t-2xl p-0', FULLSCREEN_SHEET_CLASS)}
      >
        {/* ── Zona 1: Header fijo ─────────────────────────────────── */}
        <div className="shrink-0 px-4 pb-2 pt-4 [@media(max-height:640px)]:pt-2 [@media(max-height:640px)]:pb-1">
          {/* Título + cerrar */}
          <div className="mb-3 flex items-center justify-between [@media(max-height:640px)]:mb-1.5">
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
            <TypeSegment
              className="mb-3 [@media(max-height:640px)]:mb-1.5"
              options={TYPE_OPTIONS}
              value={type}
              onChange={onChangeType}
            />
          )}

          {/* Barra resumen: cada celda abre su propio selector (billetera/fecha/repetir) */}
          <SummaryBar
            type={type}
            walletId={walletId}
            destinationWalletId={destinationWalletId}
            wallets={wallets}
            date={date}
            repeat={repeat}
            onOpen={setSheet}
          />
        </div>

        {/* ── Zona 2: Detalles siempre visibles (categoría + nota) ────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 space-y-3 [@media(max-height:640px)]:py-1 [@media(max-height:640px)]:space-y-2">
          {/* RecurringBanner en edición */}
          {isEdit && editing?.recurringRuleId && (
            <RecurringBanner ruleId={editing.recurringRuleId} onDone={close} />
          )}

          {/* Categoría (solo si no es transferencia) — fila compacta */}
          {!isTransfer && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Categoría</Label>
              <CompactCategoryRow movementType={type} value={categoryId} onChange={setCategoryId} />
            </div>
          )}

          {/* Nota */}
          <div className="space-y-1">
            <Label htmlFor="tm-desc" className="text-xs text-muted-foreground">
              Nota <span className="font-normal">(opcional)</span>
            </Label>
            <Input
              id="tm-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isTransfer ? 'Ej: Pasé plata a ahorros' : 'Ej: Compra semanal'}
              className="h-10"
            />
          </div>
        </div>

        {/* Sheet contextual: billetera / fecha / repetir (según celda tocada) */}
        <ContextSheet
          field={sheet}
          onClose={() => setSheet(null)}
          isTransfer={isTransfer}
          isEdit={isEdit}
          wallets={wallets}
          walletId={walletId}
          setWalletId={setWalletId}
          destinationWalletId={destinationWalletId}
          setDestinationWalletId={setDestinationWalletId}
          date={date}
          setDate={setDate}
          repeat={repeat}
          setRepeat={setRepeat}
          autoPost={autoPost}
          setAutoPost={setAutoPost}
        />

        {/* ── Zona 3: Footer fijo (monto + numpad + acción) ───────── */}
        <div className="shrink-0 border-t bg-background">
          {/* Display de monto (protagonista) */}
          <div className="px-4 py-3 text-center [@media(max-height:640px)]:py-1">
            <span className="text-xs font-medium text-muted-foreground [@media(max-height:640px)]:text-[10px]">Monto</span>
            <div className={cn('font-bold tracking-tight transition-colors text-4xl sm:text-5xl lg:text-6xl [@media(max-height:640px)]:text-2xl', amountColor)}>
              ${displayAmount}
            </div>
          </div>

          {/* Montos sugeridos (rápidos) */}
          <div className="px-3 py-2 flex gap-1.5 justify-center [@media(max-height:640px)]:gap-1 [@media(max-height:640px)]:px-2 [@media(max-height:640px)]:py-1">
            {[1000, 5000, 10000].map((sug) => (
              <button
                key={sug}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault()
                  setAmount(String(sug))
                }}
                className="min-h-10 flex-1 rounded-lg border border-primary bg-primary-soft px-2 text-xs font-semibold text-primary transition-colors active:scale-95 [@media(max-height:640px)]:min-h-8"
              >
                ${sug.toLocaleString('es-AR')}
              </button>
            ))}
          </div>

          {/* Numpad */}
          <Numpad value={amount} onChange={setAmount} />

          {/* Botón de acción */}
          <div className="px-3 pb-3 [@media(max-height:640px)]:pb-1.5 [@media(max-height:640px)]:pt-0.5">
            <Button
              type="button"
              onClick={() => submit()}
              disabled={!canSubmit}
              className="h-12 w-full rounded-xl text-base font-semibold [@media(max-height:640px)]:h-10 [@media(max-height:640px)]:text-sm"
            >
              {pending
                ? 'Guardando…'
                : isEdit
                  ? 'Guardar cambios'
                  : isTransfer
                    ? 'Registrar transferencia'
                    : type === 'INCOME'
                      ? 'Registrar ingreso'
                      : 'Registrar gasto'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Sheet contextual que edita billetera / fecha / repetir según la celda tocada en la barra resumen. */
function ContextSheet({
  field, onClose, isTransfer, isEdit, wallets,
  walletId, setWalletId, destinationWalletId, setDestinationWalletId,
  date, setDate, repeat, setRepeat, autoPost, setAutoPost,
}: {
  field: ContextField | null
  onClose: () => void
  isTransfer: boolean
  isEdit: boolean
  wallets: { id: string; name: string }[] | undefined
  walletId: string
  setWalletId: (v: string) => void
  destinationWalletId: string
  setDestinationWalletId: (v: string) => void
  date: string
  setDate: (v: string) => void
  repeat: boolean
  setRepeat: (v: boolean) => void
  autoPost: boolean
  setAutoPost: (v: boolean) => void
}) {
  const title = field === 'wallet'
    ? (isTransfer ? 'Origen y destino' : 'Billetera')
    : field === 'date' ? 'Fecha' : 'Repetir'

  return (
    <Sheet open={field !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetTitle className="mb-3">{title}</SheetTitle>

        {field === 'wallet' && (isTransfer ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Desde (origen)</Label>
              <WalletSelect wallets={wallets} value={walletId} onChange={setWalletId} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Hacia (destino)</Label>
              <WalletSelect wallets={wallets} value={destinationWalletId} onChange={setDestinationWalletId} />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Billetera</Label>
            <WalletSelect wallets={wallets} value={walletId} onChange={setWalletId} disabled={isEdit} />
          </div>
        ))}

        {field === 'date' && (
          <div className="flex gap-1.5">
            <DateChip label="Hoy" active={date === todayInput()} onClick={() => setDate(todayInput())} />
            <DateChip label="Ayer" active={date === yesterdayInput()} onClick={() => setDate(yesterdayInput())} />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 flex-1" />
          </div>
        )}

        {field === 'repeat' && (isEdit ? (
          <p className="text-sm text-muted-foreground">La repetición no se cambia al editar un movimiento.</p>
        ) : (
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="tm-repeat" className="text-sm font-medium">
                Repetir cada mes
                <span className="block text-xs font-normal text-muted-foreground mt-1">
                  Día {Number(date.slice(8, 10))} de cada mes
                </span>
              </Label>
              <Switch id="tm-repeat" checked={repeat} onCheckedChange={setRepeat} />
            </div>
            {repeat && (
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <Label htmlFor="tm-auto" className="text-xs font-normal text-muted-foreground">
                  Cargar automáticamente cada mes
                </Label>
                <Switch id="tm-auto" checked={autoPost} onCheckedChange={setAutoPost} />
              </div>
            )}
          </div>
        ))}

        <Button type="button" onClick={onClose} className="mt-4 h-11 w-full rounded-xl font-semibold">
          Listo
        </Button>
      </SheetContent>
    </Sheet>
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

