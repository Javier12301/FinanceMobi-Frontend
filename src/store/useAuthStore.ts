import { create } from 'zustand'
import { tokenStorage } from '@/config/tokenStorage'
import { decodeJwt, isTokenExpired } from '@/utils/jwt'
import { useOwnerStore } from './useOwnerStore'

export interface AuthUser {
  id: string
  email: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  /** Guarda el token (login/registro/google), deriva el usuario y fija el owner propio. */
  setToken: (token: string) => void
  /** Limpia sesión local (no llama al endpoint; eso lo hace el feature auth). */
  clear: () => void
}

function userFromToken(token: string): AuthUser | null {
  const payload = decodeJwt(token)
  if (!payload?.sub) return null
  return { id: payload.sub, email: payload.email }
}

// Hidratación inicial desde el almacenamiento.
const initialToken = tokenStorage.get()
const validInitialToken = initialToken && !isTokenExpired(initialToken) ? initialToken : null
const initialUser = validInitialToken ? userFromToken(validInitialToken) : null
if (initialToken && !validInitialToken) tokenStorage.remove()

export const useAuthStore = create<AuthState>((set) => ({
  token: validInitialToken,
  user: initialUser,
  isAuthenticated: !!initialUser,
  setToken: (token) => {
    const user = userFromToken(token)
    if (!user) {
      tokenStorage.remove()
      set({ token: null, user: null, isAuthenticated: false })
      return
    }
    tokenStorage.set(token)
    // El owner por defecto es uno mismo.
    useOwnerStore.getState().resetToSelf(user.id)
    set({ token, user, isAuthenticated: true })
  },
  clear: () => {
    tokenStorage.remove()
    useOwnerStore.getState().clear()
    set({ token: null, user: null, isAuthenticated: false })
  },
}))

// Si arrancamos ya autenticados, fijamos el owner propio.
if (initialUser) useOwnerStore.getState().resetToSelf(initialUser.id)
