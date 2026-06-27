import { useMemo, useState } from 'react'
import { ArrowLeftRight, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/elements/PageHeader'
import { EmptyState } from '@/components/elements/EmptyState'
import { dateGroupLabel } from '@/utils/formatDate'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useWallets } from '@/features/wallets'
import {
  useTransactions,
  useTransactionModal,
  useTransactionDrawer,
  TransactionRow,
  type Transaction,
  type TransactionFilters,
} from '@/features/transactions'

type Period = 'this' | 'last' | 'all'

function periodRange(period: Period): Pick<TransactionFilters, 'dateFrom' | 'dateTo'> {
  if (period === 'all') return {}
  const now = new Date()
  const offset = period === 'last' ? -1 : 0
  const from = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const to = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999)
  return { dateFrom: from.toISOString(), dateTo: to.toISOString() }
}

export function TransactionsPage() {
  const isReadOnly = useOwnerStore((s) => s.isReadOnly)
  const openModal = useTransactionModal((s) => s.open)
  const openDrawer = useTransactionDrawer((s) => s.open)
  const { data: wallets } = useWallets()

  const [walletId, setWalletId] = useState('all')
  const [type, setType] = useState('all')
  const [period, setPeriod] = useState<Period>('this')
  const [search, setSearch] = useState('')

  const filters: TransactionFilters = {
    ...(walletId !== 'all' ? { walletId } : {}),
    ...periodRange(period),
  }
  const { data: txns, isLoading } = useTransactions(filters)

  // El contrato no filtra por movementType ni texto -> filtro en cliente.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (txns ?? []).filter(
      (t) =>
        (type === 'all' || t.movementType === type) &&
        (!q || (t.description ?? '').toLowerCase().includes(q)),
    )
  }, [txns, type, search])

  // Agrupar por día.
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const key = dateGroupLabel(t.date)
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    return Array.from(map.entries())
  }, [filtered])

  const walletName = (id: string) => wallets?.find((w) => w.id === id)?.name

  return (
    <div>
      <PageHeader
        title="Movimientos"
        action={
          !isReadOnly && (
            <Button onClick={() => openModal()}>
              <Plus size={16} /> Registrar
            </Button>
          )
        }
      />

      {/* Filtros */}
      <div className="mb-4 flex flex-col gap-2.5 rounded-xl border bg-surface p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descripción"
            className="h-10 bg-background pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Select value={walletId} onValueChange={setWalletId}>
            <SelectTrigger className="h-10 min-w-[150px] flex-1 bg-background sm:flex-none sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las billeteras</SelectItem>
              {wallets?.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-10 min-w-[140px] flex-1 bg-background sm:flex-none sm:w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="INCOME">Ingresos</SelectItem>
              <SelectItem value="EXPENSE">Gastos</SelectItem>
              <SelectItem value="TRANSFER">Transferencias</SelectItem>
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-10 min-w-[130px] flex-1 bg-background sm:flex-none sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this">Este mes</SelectItem>
              <SelectItem value="last">Mes anterior</SelectItem>
              <SelectItem value="all">Todo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista agrupada por día */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-5">
          {groups.map(([label, rows]) => (
            <div key={label}>
              <div className="mb-1 text-sm font-medium text-muted-foreground">{label}</div>
              <div className="rounded-xl border bg-card px-3 shadow-sm">
                {rows.map((t) => (
                  <TransactionRow key={t.id} tx={t} walletName={walletName(t.walletId)} onClick={openDrawer} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ArrowLeftRight}
          title="No hay movimientos"
          description="Ajustá los filtros o registrá tu primer movimiento."
        />
      )}
    </div>
  )
}
