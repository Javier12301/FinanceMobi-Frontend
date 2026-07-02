import { Capacitor } from '@capacitor/core'
import { env } from '@/config/env'

/**
 * Solicita un ID token de Google para enviar a POST /api/auth/google.
 * - Web: Google Identity Services (script GIS) bajo demanda.
 * - Nativo (APK): selector nativo vía @capgo/capacitor-social-login.
 * En ambos casos el idToken lleva `aud` = webClientId, que el backend ya valida.
 */

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string
    callback: (res: GoogleCredentialResponse) => void
  }) => void
  prompt: () => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client'

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google')))
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar Google'))
    document.head.appendChild(script)
  })
}

export function isGoogleConfigured(): boolean {
  return !!env.googleClientId
}

let nativeInitialized = false

/** En el APK: selector nativo de Google. webClientId = el Web Client ID (audiencia del idToken). */
async function requestGoogleIdTokenNative(): Promise<string> {
  const { SocialLogin } = await import('@capgo/capacitor-social-login')
  if (!nativeInitialized) {
    await SocialLogin.initialize({ google: { webClientId: env.googleClientId } })
    nativeInitialized = true
  }
  const login = await SocialLogin.login({ provider: 'google', options: { scopes: ['email', 'profile'] } })
  // En Android el idToken viene en result.idToken (ver doc del plugin).
  const idToken = (login as { result?: { idToken?: string | null } }).result?.idToken
  if (!idToken) throw new Error('Login con Google cancelado')
  return idToken
}

/** Abre el prompt de Google y resuelve con el idToken. */
export async function requestGoogleIdToken(): Promise<string> {
  if (!env.googleClientId) {
    throw new Error('Falta configurar VITE_GOOGLE_CLIENT_ID')
  }
  if (Capacitor.isNativePlatform()) return requestGoogleIdTokenNative()
  await loadScript()
  return new Promise<string>((resolve, reject) => {
    const id = window.google?.accounts.id
    if (!id) return reject(new Error('Google no disponible'))
    id.initialize({
      client_id: env.googleClientId,
      callback: (res) => {
        if (res.credential) resolve(res.credential)
        else reject(new Error('Login con Google cancelado'))
      },
    })
    id.prompt()
  })
}
