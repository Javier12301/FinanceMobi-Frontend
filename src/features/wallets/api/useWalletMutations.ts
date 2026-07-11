import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, isApiError } from '@/config/api'
import { env } from '@/config/env'
import { useOnlineStore } from '@/store/useOnlineStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { enqueueMutation, offlineMutationId } from '@/features/offline'
import type { CreateWalletInput, UpdateWalletInput, Wallet } from '../types/wallet'
import { walletsKey } from './useWallets'

function useWalletContext() {
  const queryClient = useQueryClient()
  const ownerId = useOwnerStore((s) => s.activeOwnerId)
  const offline = () => env.isNative && useOnlineStore.getState().serverReachable === false
  const invalidate = () => queryClient.invalidateQueries({ queryKey: walletsKey(ownerId) })
  return { queryClient, ownerId, offline, invalidate }
}

function optimisticWallet(ownerId: string, input: CreateWalletInput): Wallet {
  const now = new Date().toISOString()
  return { id: input.id!, ownerId, typeId: input.typeId, name: input.name, description: input.description ?? null, initialBalance: String(input.initialBalance), currentBalance: String(input.initialBalance), createdAt: now, updatedAt: now }
}

export function useCreateWallet() {
  const { queryClient, ownerId, offline, invalidate } = useWalletContext()
  return useMutation({
    mutationFn: async (input: CreateWalletInput) => {
      const enqueue = () => enqueueMutation({ id: input.id!, ownerId, method: 'post', endpoint: '/wallets', body: input })
      if (offline()) { await enqueue(); return null as unknown as Wallet }
      try { return (await api.post<Wallet>('/wallets', input)).data }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return null as unknown as Wallet }; throw e }
    },
    onMutate: (input) => {
      input.id ??= crypto.randomUUID()
      const snapshot = queryClient.getQueryData<Wallet[]>(walletsKey(ownerId))
      queryClient.setQueryData<Wallet[]>(walletsKey(ownerId), (old) => old ? [optimisticWallet(ownerId!, input), ...old] : old)
      return { snapshot }
    },
    onError: (_e, _input, ctx) => queryClient.setQueryData(walletsKey(ownerId), ctx?.snapshot),
    onSuccess: () => { if (!offline()) invalidate() },
  })
}

export function useUpdateWallet() {
  const { queryClient, ownerId, offline, invalidate } = useWalletContext()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateWalletInput }) => {
      const enqueue = () => enqueueMutation({ id: offlineMutationId('wallet', 'put', id), ownerId, method: 'put', endpoint: `/wallets/${id}`, body: input })
      if (offline()) { await enqueue(); return null as unknown as Wallet }
      try { return (await api.put<Wallet>(`/wallets/${id}`, input)).data }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return null as unknown as Wallet }; throw e }
    },
    onMutate: ({ id, input }) => {
      const snapshot = queryClient.getQueryData<Wallet[]>(walletsKey(ownerId))
      queryClient.setQueryData<Wallet[]>(walletsKey(ownerId), (old) => old?.map((w) => w.id === id ? { ...w, ...input, description: input.description ?? w.description, initialBalance: input.initialBalance !== undefined ? String(input.initialBalance) : w.initialBalance, currentBalance: input.initialBalance !== undefined ? String(Number(w.currentBalance) + input.initialBalance - Number(w.initialBalance)) : w.currentBalance, updatedAt: new Date().toISOString() } : w))
      return { snapshot }
    },
    onError: (_e, _input, ctx) => queryClient.setQueryData(walletsKey(ownerId), ctx?.snapshot),
    onSuccess: () => { if (!offline()) invalidate() },
  })
}

export function useDeleteWallet() {
  const { queryClient, ownerId, offline, invalidate } = useWalletContext()
  return useMutation({
    mutationFn: async (id: string) => {
      const enqueue = () => enqueueMutation({ id: offlineMutationId('wallet', 'delete', id), ownerId, method: 'delete', endpoint: `/wallets/${id}`, body: {} })
      if (offline()) { await enqueue(); return }
      try { await api.delete(`/wallets/${id}`) }
      catch (e) { if (env.isNative && isApiError(e) && e.status === 0) { await enqueue(); return }; throw e }
    },
    onMutate: (id) => {
      const snapshot = queryClient.getQueryData<Wallet[]>(walletsKey(ownerId))
      queryClient.setQueryData<Wallet[]>(walletsKey(ownerId), (old) => old?.filter((w) => w.id !== id))
      return { snapshot }
    },
    onError: (_e, _id, ctx) => queryClient.setQueryData(walletsKey(ownerId), ctx?.snapshot),
    onSuccess: () => { if (!offline()) invalidate() },
  })
}
