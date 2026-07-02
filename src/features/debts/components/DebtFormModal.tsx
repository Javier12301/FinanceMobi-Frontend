import { useEffect, useState, type FormEvent } from 'react'
import { ArrowUpRight, ArrowDownLeft, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/config/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ResponsiveModal } from '@/components/elements/ResponsiveModal'
import { TypeSegment, type TypeSegmentOption } from '@/components/elements/TypeSegment'
import { useWallets } from '@/features/wallets'
import { useCreateDebt } from '../api/useDebts'
import type { DebtDirection } from '../types/debt'

interface DebtFormModalProps {
  open: boolean
  onClose: () => void
}

const DIRECTION_OPTIONS: TypeSegmentOption<DebtDirection>[] = [
  {
    value: 'I_OWE',
    label: 'Debo',
    icon: ArrowUpRight,
    hint: 'Préstamo de banco, le debo a alguien',
    activeClass: 'border-primary bg-primary-soft text-primary',
  },
  {
    value: 'OWED_TO_ME',
    label: 'Me deben',
    icon: ArrowDownLeft,
    hint: 'Le presté, me tienen que pagar',
    activeClass: 'border-primary bg-primary-soft text-primary',
  },
]

/** Alta de deuda/préstamo. Local a la pantalla Plan (no es modal global). */
export function DebtFormModal({ open, onClose }: DebtFormModalProps) {
  const create = useCreateDebt()
  const { data: wallets } = useWallets()

  const [direction, setDirection] = useState<DebtDirection>('I_OWE')
  const [counterparty, setCounterparty] = useState('')
  const [principal, setPrincipal] = useState('')
  const [installments, setInstallments] = useState('')
  const [walletId, setWalletId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  const hasInstallments = Number(installments) > 0
  const owed = direction === 'OWED_TO_ME'

  useEffect(() => {
    if (!open) return
    setDirection('I_OWE')
    setCounterparty('')
    setPrincipal('')
    setInstallments('')
    setWalletId('')
    setDueDate('')
    setNotes('')
  }, [open])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!counterparty.trim()) return toast.error('Ingresá la contraparte (banco, persona…)')
    const amount = Number(principal)
    if (!amount || amount <= 0) return toast.error('Ingresá un monto válido')
    if (hasInstallments && !walletId) return toast.error('Elegí la billetera para las cuotas')

    create.mutate(
      {
        direction,
        counterparty: counterparty.trim(),
        principal: amount,
        ...(hasInstallments ? { installmentsTotal: Number(installments), walletId } : {}),
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast.success(direction === 'I_OWE' ? 'Deuda agregada' : 'Préstamo registrado')
          onClose()
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    )
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Nueva deuda o préstamo"
      className="sm:max-w-lg"
    >
      <form id="debt-form" onSubmit={onSubmit} className="flex flex-col gap-4 py-1">
        {/* Dirección */}
        <TypeSegment
          variant="card"
          options={DIRECTION_OPTIONS}
          value={direction}
          onChange={setDirection}
        />

        {/* Monto protagonista */}
        <div className="rounded-xl border border-border bg-surface px-4 py-3 text-center">
          <div className="text-xs font-medium text-muted-foreground">Monto total</div>
          <div className="flex items-center justify-center gap-1">
            <span className="text-2xl font-bold text-muted-foreground">$</span>
            <input
              id="d-principal"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              className="w-full min-w-0 bg-transparent text-center text-3xl font-bold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Contraparte */}
        <div className="space-y-1.5">
          <Label htmlFor="d-counterparty">Contraparte</Label>
          <Input
            id="d-counterparty"
            placeholder="Ej: Banco Macro, Juan"
            value={counterparty}
            onChange={(e) => setCounterparty(e.target.value)}
          />
        </div>

        {/* Cuotas + vencimiento */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="d-installments">
              Cuotas <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="d-installments"
              type="number"
              inputMode="numeric"
              min="1"
              placeholder="Ej: 12"
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-due">
              Última cuota <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input id="d-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        {/* Billetera sugerida (solo si hay cuotas) */}
        {hasInstallments && (
          <div className="space-y-1.5">
            <Label htmlFor="d-wallet">
              {owed ? 'Billetera sugerida para cobrar' : 'Billetera sugerida para pagar'}
            </Label>
            <Select value={walletId} onValueChange={setWalletId}>
              <SelectTrigger id="d-wallet" className="w-full">
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
            <p className="text-xs text-muted-foreground">
              Se usará cuando confirmes {owed ? 'cada cobro' : 'cada pago'}.
            </p>
          </div>
        )}

        {/* Nota */}
        <div className="space-y-1.5">
          <Label htmlFor="d-notes">
            Nota <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Textarea
            id="d-notes"
            rows={2}
            placeholder="Ej: Préstamo personal a 12 cuotas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none"
          />
        </div>

        {/* Aclaración: sin débito automático */}
        <div className="flex items-start gap-2 rounded-lg bg-primary-soft px-3 py-2.5 text-xs text-primary">
          <Info size={15} className="mt-0.5 shrink-0" />
          <span>El dinero no se mueve automáticamente. Cada {owed ? 'cobro' : 'pago'} se registra cuando lo confirmes.</span>
        </div>
      </form>

      <div className="flex justify-end gap-2.5 pt-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" form="debt-form" disabled={create.isPending}>
          {create.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </ResponsiveModal>
  )
}
