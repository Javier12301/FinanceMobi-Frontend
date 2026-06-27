import { env } from '@/config/env'

/**
 * Carga Google Identity Services y solicita un ID token vía botón/One-Tap.
 * Devuelve el credential (idToken) para enviar a POST /api/auth/google.
 *
 * ponytail: usa el script oficial de GIS bajo demanda; en mobile (Capacitor)
 * se reemplaza por @capacitor-community/google-auth (selector nativo).
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

/** Abre el prompt de Google y resuelve con el idToken. */
export async function requestGoogleIdToken(): Promise<string> {
  if (!env.googleClientId) {
    throw new Error('Falta configurar VITE_GOOGLE_CLIENT_ID')
  }
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
