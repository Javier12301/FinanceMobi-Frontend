import { useMutation, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { api, isApiError } from '@/config/api'
import { useOnlineStore } from '@/store/useOnlineStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { enqueueMutation, offlineMutationId } from '@/features/offline'
import { walletsKey } from '@/features/wallets/api/useWallets'
import type { Wallet } from '@/features/wallets'
import { parseDecimal } from '@/utils/formatCurrency'
import type { CreateTransactionInput, Transaction, TransactionMovementType, UpdateTransactionInput } from '../types/transaction'

/** Un movimiento como impacto de saldo (lo mínimo para saber cómo mueve las billeteras). */
interface Impact {
  movementType: TransactionMovementType
  walletId: string
  destinationWalletId?: string | null
  amount: number
}

/** Aplica (sign=1) o revierte (sign=-1) el impacto de un movimiento sobre el saldo optimista de
 *  las billeteras. El balance total sale del currentBalance de cada wallet, no del listado, así que
 *  sin esto el balance no se mueve offline (el server reconcilia al sincronizar). Editar-con-cambio
 *  de billetera se hace revirtiendo el impacto viejo (-1) y aplicando el nuevo (+1). */
function applyImpact(wallets: Wallet[] | undefined, m: Impact, sign: 1 | -1): Wallet[] | undefined {
  const amount = Number(m.amount) * sign
  return wallets?.map((w) => {
    let delta = 0
    if (m.movementType === 'INCOME' && w.id === m.walletId) delta = amount
    else if (m.movementType === 'EXPENSE' && w.id === m.walletId) delta = -amount
    else if (m.movementType === 'TRANSFER') {
      if (w.id === m.walletId) delta = -amount
      else if (w.id === m.destinationWalletId) delta = amount
    }
    return delta === 0 ? w : { ...w, currentBalance: String(parseDecimal(w.currentBalance) + delta) }
  })
}

/** Invalida transacciones + wallets (cambia el balance) del owner activo. */
function useInvalidateAfterTxn() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  return () => {
    queryClient.invalidateQueries({ queryKey: ['transactions', ownerId] })
    queryClient.invalidateQueries({ queryKey: walletsKey(ownerId) })
  }
}

/** POST /api/transactions
 *  Con update optimista: el movimiento se ve al instante y, sin red, la mutación queda
 *  pausada (networkMode online de React Query) y se reenvía sola al reconectar.
 *  El id lo genera el cliente y se manda al backend: el POST es idempotente (T2C), así el
 *  replay del outbox no duplica y el optimista comparte el mismo id que la fila del server. */
export function useCreateTransaction() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  const invalidate = useInvalidateAfterTxn()
  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const enqueue = () =>
        enqueueMutation({ id: input.id!, ownerId, method: 'post', endpoint: '/transactions', body: input })
      // Lectura síncrona del flag (sin await en el path caliente): el listener nativo de AppBoot
      // lo pone en false al instante al desconectarse. Si igual quedó stale, el catch de status 0
      // cae al outbox. navigator.onLine no sirve (miente en el WebView de Android).
      const offline = env.isNative && useOnlineStore.getState().serverReachable === false
      if (offline) {
        await enqueue()
        return null as unknown as Transaction // optimista ya aplicado; el drain lo sube luego
      }
      try {
        const { data } = await api.post<Transaction>('/transactions', input)
        return data
      } catch (e) {
        // Red caída (timeout / status 0) que el flag no alcanzó a detectar: caer al outbox
        // en vez de perder el movimiento. El id ya está fijo (onMutate) → replay idempotente.
        if (env.isNative && isApiError(e) && e.status === 0) {
          await enqueue()
          return null as unknown as Transaction
        }
        throw e
      }
    },
    onMutate: async (input: CreateTransactionInput) => {
      // Sin await: cancelar un refetch pausado (offline) nunca resuelve y colgaría el onMutate
      // (botón "Guardando..." infinito en la 2ª alta offline en adelante).
      void queryClient.cancelQueries({ queryKey: ['transactions', ownerId] })
      // Mismo id para el optimista y el POST (idempotencia del replay offline).
      input.id ??= crypto.randomUUID()
      const now = new Date().toISOString()
      const optimistic: Transaction = {
        id: input.id,
        walletId: input.walletId,
        destinationWalletId: input.destinationWalletId ?? null,
        categoryId: input.categoryId ?? null,
        amount: String(input.amount),
        description: input.description ?? null,
        date: input.date,
        movementType: input.movementType,
        createdAt: now,
        updatedAt: now,
      }
      const snapshots = queryClient.getQueriesData<Transaction[]>({ queryKey: ['transactions', ownerId] })
      queryClient.setQueriesData<Transaction[]>({ queryKey: ['transactions', ownerId] }, (old) =>
        old ? [optimistic, ...old] : old,
      )
      // Ajuste optimista del saldo de billeteras (de acá sale el balance total).
      const walletSnapshots = queryClient.getQueriesData<Wallet[]>({ queryKey: walletsKey(ownerId) })
      queryClient.setQueriesData<Wallet[]>({ queryKey: walletsKey(ownerId) }, (old) =>
        applyImpact(old, input, 1),
      )
      return { snapshots, walletSnapshots }
    },
    onError: (_e, _input, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
      ctx?.walletSnapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    // Offline no invalidamos: el refetch quedaría pausado (inútil) y trabaría la próxima alta.
    // Al reconectar, drainOutbox + AppBoot reconcilian con el server.
    onSuccess: () => {
      if (useOnlineStore.getState().serverReachable !== false) invalidate()
    },
  })
}

/** PUT /api/transactions/:id — edita un movimiento (incluye cambiar de billetera; el backend
 *  reconcilia el saldo entre la vieja y la nueva). El movementType es inmutable en edición.
 *  Optimista + offline (mismo patrón que el alta): editar offline encola el PUT en el outbox. */
type UpdateVars = { id: string; input: UpdateTransactionInput; original: Transaction }

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  const invalidate = useInvalidateAfterTxn()
  return useMutation({
    mutationFn: async ({ id, input }: UpdateVars) => {
      // id sintético para el outbox: NO el txId pelado, que chocaría con el INSERT OR IGNORE de un
      // alta/edición pendiente del mismo id. drainOutbox reenvía FIFO y el PUT del backend es
      // replay-safe (setea valores absolutos revirtiendo contra el oldTx persistido → converge).
      const enqueue = () =>
        enqueueMutation({ id: `${id}:put:${Date.now()}`, ownerId, method: 'put', endpoint: `/transactions/${id}`, body: input })
      const offline = env.isNative && useOnlineStore.getState().serverReachable === false
      if (offline) {
        await enqueue()
        return null as unknown as Transaction // optimista ya aplicado; el drain lo sube luego
      }
      try {
        const { data } = await api.put<Transaction>(`/transactions/${id}`, input)
        return data
      } catch (e) {
        if (env.isNative && isApiError(e) && e.status === 0) {
          await enqueue()
          return null as unknown as Transaction
        }
        throw e
      }
    },
    onMutate: async ({ id, input, original }: UpdateVars) => {
      void queryClient.cancelQueries({ queryKey: ['transactions', ownerId] })
      const snapshots = queryClient.getQueriesData<Transaction[]>({ queryKey: ['transactions', ownerId] })
      // Reemplazar la tx en el listado con los campos editados.
      queryClient.setQueriesData<Transaction[]>({ queryKey: ['transactions', ownerId] }, (old) =>
        old?.map((t) => {
          if (t.id !== id) return t
          const patched: Transaction = { ...t, updatedAt: new Date().toISOString() }
          if (input.categoryId !== undefined) patched.categoryId = input.categoryId
          if (input.amount !== undefined) patched.amount = String(input.amount)
          if (input.description !== undefined) patched.description = input.description ?? null
          if (input.date !== undefined) patched.date = input.date
          if (input.walletId !== undefined) patched.walletId = input.walletId
          if (input.destinationWalletId !== undefined) patched.destinationWalletId = input.destinationWalletId
          return patched
        }),
      )
      // Saldo optimista: revertir el impacto original y aplicar el nuevo (cubre cambio de billetera).
      const walletSnapshots = queryClient.getQueriesData<Wallet[]>({ queryKey: walletsKey(ownerId) })
      const newImpact: Impact = {
        movementType: original.movementType,
        walletId: input.walletId ?? original.walletId,
        destinationWalletId: input.destinationWalletId ?? original.destinationWalletId,
        amount: input.amount ?? Number(original.amount),
      }
      queryClient.setQueriesData<Wallet[]>({ queryKey: walletsKey(ownerId) }, (old) => {
        const reverted = applyImpact(old, { ...original, amount: Number(original.amount) }, -1)
        return applyImpact(reverted, newImpact, 1)
      })
      return { snapshots, walletSnapshots }
    },
    onError: (_e, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
      ctx?.walletSnapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSuccess: () => {
      if (useOnlineStore.getState().serverReachable !== false) invalidate()
    },
  })
}

/**
 * DELETE /api/transactions/:id — soft delete real (v2).
 * Revierte balance y limpia adjuntos en el backend. 409 si tiene adjuntos y Drive no conectado.
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  const invalidate = useInvalidateAfterTxn()
  return useMutation({
    mutationFn: async (id: string) => {
      const enqueue = () => enqueueMutation({ id: offlineMutationId('transaction', 'delete', id), ownerId, method: 'delete', endpoint: `/transactions/${id}`, body: {} })
      const offline = env.isNative && useOnlineStore.getState().serverReachable === false
      if (offline) { await enqueue(); return }
      try { await api.delete(`/transactions/${id}`) }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return }; throw e }
    },
    onMutate: (id) => {
      const txSnapshot = queryClient.getQueryData<Transaction[]>(['transactions', ownerId])
      const walletSnapshot = queryClient.getQueryData<Wallet[]>(walletsKey(ownerId))
      const deleted = txSnapshot?.find((tx) => tx.id === id)
      queryClient.setQueryData<Transaction[]>(['transactions', ownerId], (old) => old?.filter((tx) => tx.id !== id))
      if (deleted) queryClient.setQueryData<Wallet[]>(walletsKey(ownerId), (old) => applyImpact(old, { ...deleted, amount: Number(deleted.amount) }, -1))
      return { txSnapshot, walletSnapshot }
    },
    onError: (_e, _id, ctx) => { queryClient.setQueryData(['transactions', ownerId], ctx?.txSnapshot); queryClient.setQueryData(walletsKey(ownerId), ctx?.walletSnapshot) },
    onSuccess: () => { if (useOnlineStore.getState().serverReachable !== false) invalidate() },
  })
}
