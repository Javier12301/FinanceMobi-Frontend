import axios, { AxiosError } from 'axios'
import { env } from './env'
import { useAuthStore } from '@/store/useAuthStore'
import { useOwnerStore } from '@/store/useOwnerStore'

/** Error normalizado que consume la UI. */
export interface ApiError {
  status: number
  message: string
  /** true para endpoints stub (501): mostrar "Próximamente" en vez de error rojo. */
  notImplemented: boolean
}

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  // Sin timeout, una request offline cuelga para siempre (botón "Guardando..." infinito).
  // Con timeout, falla como error de red (status 0) y la mutación puede caer al outbox.
  timeout: 8000,
})

// ─── Request: inyecta auth + contexto de owner ──────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.set('Authorization', `Bearer ${token}`)

  const ownerId = useOwnerStore.getState().activeOwnerId
  if (ownerId) config.headers.set('X-Owner-Id', ownerId)

  return config
})

// ─── Response: normaliza errores del contrato { error: "..." } ──────────────
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: string }>) => {
    const status = error.response?.status ?? 0
    const message =
      error.response?.data?.error ??
      (status === 0 ? 'No se pudo conectar con el servidor' : 'Ocurrió un error inesperado')

    // 401: sesión inválida/expirada/revocada -> limpiar y mandar a login.
    if (status === 401) {
      useAuthStore.getState().clear()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }

    const apiError: ApiError = { status, message, notImplemented: status === 501 }
    return Promise.reject(apiError)
  },
)

/** Type guard para usar en catch / onError de mutaciones. */
export function isApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'status' in e && 'message' in e
}

/** Mensaje seguro para toasts, sea cual sea el error. */
export function errorMessage(e: unknown): string {
  return isApiError(e) ? e.message : 'Ocurrió un error inesperado'
}

/**
 * True si el endpoint aún no está publicado por el backend (404) o es stub (501).
 * Las features "dormidas" (recurrentes, presupuestos, PUT/DELETE categorías) lo usan
 * para mostrar estado vacío/"próximamente" en vez de un error rojo.
 * ponytail: una función, no un sistema de feature-flags.
 */
export function isNotAvailable(e: unknown): boolean {
  return isApiError(e) && (e.status === 404 || e.notImplemented)
}
