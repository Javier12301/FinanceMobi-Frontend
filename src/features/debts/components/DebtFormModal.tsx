import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/config/api'
import { ResponsiveModal } from '@/components/elements/ResponsiveModal'
import { useCreateDebt } from '../api/useDebts'
import type { DebtDirection } from '../types/debt'

interface DebtFormModalProps {
  open: boolean
  onClose: () => void
}

/** Alta de deuda/préstamo. Local a la pantalla Plan (no es modal global). */
export function DebtFormModal({ open, onClose }: DebtFormModalProps) {
  const create = useCreateDebt()

  const [direction, setDirection] = useState<DebtDirection>('I_OWE')
  const [counterparty, setCounterparty] = useState('')
  const [principal, setPrincipal] = useState('')
  const [installments, setInstallments] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    setDirection('I_OWE')
    setCounterparty('')
    setPrincipal('')
    setInstallments('')
    setDueDate('')
    setNotes('')
  }, [open])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!counterparty.trim()) return toast.error('Ingresá la contraparte (banco, persona…)')
    const amount = Number(principal)
    if (!amount || amount <= 0) return toast.error('Ingresá un monto válido')

    create.mutate(
      {
        direction,
        counterparty: counterparty.trim(),
        principal: amount,
        installmentsTotal: Number(installments) || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        notes: notes.trim() || null,
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

  const dirBtn = (value: DebtDirection, label: string, hint: string) => (
    <button
      type="button"
      onClick={() => setDirection(value)}
      className={cn(
        'flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors',
        direction === value
          ? 'border-primary bg-primary-soft text-primary'
          : 'text-muted-foreground hover:bg-accent/50',
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="text-[11px] font-normal">{hint}</span>
    </button>
  )

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Nueva deuda o préstamo"
      className="sm:max-w-lg"
    >
      <form id="debt-form" onSubmit={onSubmit} className="flex flex-col gap-4 py-1">
        <div className="grid grid-cols-2 gap-2">
          {dirBtn('I_OWE', 'Debo', 'Préstamo de banco, le debo a alguien')}
          {dirBtn('OWED_TO_ME', 'Me deben', 'Le presté, me tienen que pagar')}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="d-counterparty">Contraparte</Label>
          <Input
            id="d-counterparty"
            placeholder="Ej: Banco Macro, Juan"
            value={counterparty}
            onChange={(e) => setCounterparty(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="d-principal">Monto total</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              id="d-principal"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              className="pl-7"
            />
          </div>
        </div>

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
              Vencimiento <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input id="d-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

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
