import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, Delete, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { TypeSegment, type TypeSegmentOption } from '@/components/elements/TypeSegment'
import { errorMessage, isNotAvailable } from '@/config/api'
import { useOnlineStore } from '@/store/useOnlineStore'
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
  return repeat ? 'Cada mes' : 'Nunca'
}

function formatFullDate(dateInput: string): string {
  const [y, m, d] = dateInput.split('-')
  return `${d}/${m}/${y}`
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
  onSwap,
}: {
  type: MovementType
  walletId: string
  destinationWalletId: string
  wallets: { id: string; name: string }[] | undefined
  date: string
  repeat: boolean
  onOpen: (field: ContextField) => void
  onSwap: () => void
}) {
  // ponytail: celda compacta reutilizable; min-h por altura, no por ancho, para no comer 110px en 320x568
  const cellClass =
    'flex flex-col gap-0.5 rounded-md bg-background p-2 text-left text-xs transition-colors hover:bg-muted min-h-[50px] [@media(max-height:640px)]:min-h-0 [@media(max-height:640px)]:p-1.5'
  const walletName = (id: string) => wallets?.find((w) => w.id === id)?.name || 'Seleccionar'

  // Transferencia: Origen ⇄ Destino como fila principal, Fecha/Repetir como secundaria.
  if (type === 'TRANSFER') {
    const canSwap = !!walletId && !!destinationWalletId
    return (
      <div className="mb-2 space-y-2 rounded-lg border border-border bg-card p-2.5 [@media(max-height:640px)]:mb-1.5 [@media(max-height:640px)]:space-y-1.5 [@media(max-height:640px)]:p-1.5">
        {/* Fila principal: Origen ⇄ Destino */}
        <div className="flex items-stretch gap-2">
          <button type="button" onClick={() => onOpen('wallet')} className={cn(cellClass, 'flex-1')}>
            <span className="font-semibold text-foreground">Origen</span>
            <span className="text-muted-foreground text-[10px] line-clamp-2">{walletName(walletId)}</span>
          </button>
          <button
            type="button"
            onClick={onSwap}
            disabled={!canSwap}
            aria-label="Intercambiar origen y destino"
            className="flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full border border-primary bg-primary-soft text-primary transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeftRight size={16} />
          </button>
          <button type="button" onClick={() => onOpen('wallet')} className={cn(cellClass, 'flex-1')}>
            <span className="font-semibold text-foreground">Destino</span>
            <span className="text-muted-foreground text-[10px] line-clamp-2">{walletName(destinationWalletId)}</span>
          </button>
        </div>
        {/* Fila secundaria: Fecha | Repetir */}
        <div className="grid grid-cols-2 gap-2 [@media(max-height:640px)]:gap-1">
          <button type="button" onClick={() => onOpen('date')} className={cellClass}>
            <span className="font-semibold text-foreground">Fecha</span>
            <span className="text-muted-foreground text-[10px]">{formatDateShort(date)}</span>
          </button>
          <button type="button" onClick={() => onOpen('repeat')} className={cellClass}>
            <span className="font-semibold text-foreground">Repetir</span>
            <span className="text-muted-foreground text-[10px]">{formatRepeatShort(repeat)}</span>
          </button>
        </div>
      </div>
    )
  }

  // Gasto/Ingreso: Billetera | Fecha | Repetir
  return (
    <div className="mb-2 grid grid-cols-3 gap-2 rounded-lg border border-border bg-card p-2.5 max-[360px]:grid-cols-2 max-[360px]:gap-1.5 [@media(max-height:640px)]:mb-1.5 [@media(max-height:640px)]:p-1.5 [@media(max-height:640px)]:gap-1">
      <button type="button" onClick={() => onOpen('wallet')} className={cellClass}>
        <span className="font-semibold text-foreground">Billetera</span>
        <span className="text-muted-foreground text-[10px] line-clamp-2">
          {formatWalletDisplay(type, walletId, destinationWalletId, wallets)}
        </span>
      </button>

      <button type="button" onClick={() => onOpen('date')} className={cellClass}>
        <span className="font-semibold text-foreground">Fecha</span>
        <span className="text-muted-foreground text-[10px]">{formatDateShort(date)}</span>
      </button>

      <button type="button" onClick={() => onOpen('repeat')} className={cellClass}>
        <span className="font-semibold text-foreground">Repetir</span>
        <span className="text-muted-foreground text-[10px]">{formatRepeatShort(repeat)}</span>
      </button>
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
      if (t !== 'ADJUSTMENT') setType(t)
      setAmount(source.amount)
      setWalletId(source.walletId)
      setDestinationWalletId(source.destinationWalletId ?? '')
      setCategoryId(source.categoryId ?? '')
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
          original: editing,
          input: {
            amount: amountNum,
            // Las transferencias no llevan categoría.
            ...(isTransfer ? {} : { categoryId }),
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
      // Offline: el optimista ya muestra el movimiento, así que cerramos y avisamos al instante.
      // Usamos el flag confiable (serverReachable), NO navigator.onLine (miente en el WebView Android).
      const offline = useOnlineStore.getState().serverReachable === false
      create.mutate(
        {
          walletId,
          categoryId: isTransfer ? undefined : categoryId,
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
        <div className="shrink-0 px-4 pb-1.5 pt-3 [@media(max-height:640px)]:pt-2 [@media(max-height:640px)]:pb-1">
          {/* Título + cerrar */}
          <div className="mb-1.5 flex items-center justify-between [@media(max-height:640px)]:mb-1.5">
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
              className="mb-1.5 [@media(max-height:640px)]:mb-1.5"
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
            onSwap={() => {
              setWalletId(destinationWalletId)
              setDestinationWalletId(walletId)
            }}
          />
        </div>

        {/* ── Zona 2: Detalles siempre visibles (categoría + nota) ────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-1.5 space-y-2.5 [@media(max-height:640px)]:py-1 [@media(max-height:640px)]:space-y-2">
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
          <div className="px-4 py-1.5 text-center [@media(max-height:640px)]:py-1">
            <span className="text-xs font-medium text-muted-foreground [@media(max-height:640px)]:text-[10px]">Monto</span>
            <div className={cn('font-bold tracking-tight transition-colors text-4xl sm:text-5xl lg:text-6xl [@media(max-height:640px)]:text-2xl', amountColor)}>
              ${displayAmount}
            </div>
          </div>

          {/* Montos rápidos (aditivos: tocar dos veces $1.000 = $2.000) */}
          <div className="px-3 py-1.5 flex gap-1.5 justify-center [@media(max-height:640px)]:gap-1 [@media(max-height:640px)]:px-2 [@media(max-height:640px)]:py-1">
            {[1000, 5000, 10000].map((sug) => (
              <button
                key={sug}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault()
                  setAmount((prev) => {
                    const next = (Number(prev) || 0) + sug
                    // respetar el mismo tope de dígitos que el keypad
                    if (String(Math.trunc(next)).length > 10) return prev
                    return String(next)
                  })
                }}
                className="min-h-10 flex-1 rounded-lg border border-primary bg-primary-soft px-2 text-xs font-semibold text-primary transition-colors active:scale-95 [@media(max-height:640px)]:min-h-8"
              >
                +${sug.toLocaleString('es-AR')}
              </button>
            ))}
          </div>

          {/* Numpad */}
          <Numpad value={amount} onChange={setAmount} />

          {/* Botón de acción */}
          <div className="px-3 pb-[calc(0.75rem_+_var(--safe-area-inset-bottom))] [@media(max-height:640px)]:pb-[calc(0.375rem_+_var(--safe-area-inset-bottom))] [@media(max-height:640px)]:pt-0.5">
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
  const meta = {
    wallet: {
      title: isTransfer ? 'Origen y destino' : 'Billetera',
      subtitle: isTransfer ? 'Desde dónde sale y a dónde entra' : 'Desde qué billetera se registra',
    },
    date: { title: 'Fecha', subtitle: 'Cuándo ocurrió el movimiento' },
    repeat: { title: 'Repetir', subtitle: 'Agendalo como movimiento fijo mensual' },
  }[field ?? 'wallet']

  const day = Number(date.slice(8, 10))

  return (
    <Sheet open={field !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pt-5 pb-[calc(1.25rem_+_var(--safe-area-inset-bottom))]">
        <SheetTitle className="text-lg">{meta.title}</SheetTitle>
        <p className="mb-4 mt-0.5 text-sm text-muted-foreground">{meta.subtitle}</p>

        {field === 'wallet' && (isTransfer ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Desde (origen)</Label>
              <WalletList wallets={wallets} value={walletId} onChange={setWalletId} exclude={destinationWalletId} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Hacia (destino)</Label>
              <WalletList wallets={wallets} value={destinationWalletId} onChange={setDestinationWalletId} exclude={walletId} />
            </div>
          </div>
        ) : (
          <WalletList wallets={wallets} value={walletId} onChange={setWalletId} />
        ))}

        {field === 'date' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <OptionCard title="Hoy" desc={formatFullDate(todayInput())} active={date === todayInput()} onClick={() => setDate(todayInput())} />
              <OptionCard title="Ayer" desc={formatFullDate(yesterdayInput())} active={date === yesterdayInput()} onClick={() => setDate(yesterdayInput())} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-date" className="text-xs font-medium text-muted-foreground">Otra fecha</Label>
              <Input id="cs-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
            </div>
          </div>
        )}

        {field === 'repeat' && (isEdit ? (
          <p className="text-sm text-muted-foreground">La repetición no se cambia al editar un movimiento.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <OptionCard title="Nunca" desc="Movimiento único" active={!repeat} onClick={() => setRepeat(false)} />
              <OptionCard title="Cada mes" desc={`El día ${day}`} active={repeat} onClick={() => setRepeat(true)} />
            </div>
            {repeat && (
              <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                <Label htmlFor="tm-auto" className="text-sm font-medium">
                  Cargar automáticamente
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    Se registra solo cada mes
                  </span>
                </Label>
                <Switch id="tm-auto" checked={autoPost} onCheckedChange={setAutoPost} />
              </div>
            )}
          </div>
        ))}

        <Button type="button" onClick={onClose} className="mt-5 h-11 w-full rounded-xl font-semibold">
          Listo
        </Button>
      </SheetContent>
    </Sheet>
  )
}

/** Lista de billeteras seleccionable (más clara que un select nativo dentro de un sheet). */
function WalletList({
  wallets,
  value,
  onChange,
  exclude,
}: {
  wallets: { id: string; name: string }[] | undefined
  value: string
  onChange: (v: string) => void
  exclude?: string
}) {
  const options = wallets?.filter((w) => w.id !== exclude) ?? []
  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay billeteras disponibles.</p>
  }
  return (
    <div className="max-h-56 space-y-1.5 overflow-y-auto">
      {options.map((w) => {
        const active = w.id === value
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => onChange(w.id)}
            className={cn(
              'flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-colors',
              active ? 'border-primary bg-primary-soft text-primary' : 'border-border hover:bg-muted',
            )}
          >
            {w.name}
            {active && <Check size={16} />}
          </button>
        )
      })}
    </div>
  )
}

/** Card seleccionable (título + descripción) para opciones de fecha/repetición. */
function OptionCard({ title, desc, active, onClick }: { title: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border-2 p-3 text-left transition-colors',
        active ? 'border-primary bg-primary-soft text-primary' : 'border-border text-foreground hover:bg-muted',
      )}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className={cn('mt-0.5 text-xs', active ? 'text-primary/80' : 'text-muted-foreground')}>{desc}</div>
    </button>
  )
}

