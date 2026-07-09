import { Capacitor } from '@capacitor/core'
import { z } from 'zod'

const schema = z.object({
  VITE_API_BASE_URL: z.union([z.string().url(), z.literal('auto')]),
  VITE_GOOGLE_CLIENT_ID: z.string().optional().default(''),
})

const parsed = schema.safeParse(import.meta.env)

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:', parsed.error.flatten().fieldErrors)
  throw new Error('Configuración de entorno inválida. Revisá tu archivo .env (ver .env.example).')
}

const data = parsed.data

// En el APK (Capacitor) window.location es localhost://, así que la URL del backend
// no puede derivarse del host: la configura el usuario y se persiste en localStorage.
// ponytail: localStorage alcanza en el WebView de Capacitor (persiste entre reinicios);
// migrar a @capacitor/preferences solo si el SO empieza a limpiar el storage del WebView.
const SERVER_URL_KEY = 'fv.serverUrl'

export function getServerUrl(): string | null {
  try {
    return localStorage.getItem(SERVER_URL_KEY)
  } catch {
    return null
  }
}

/** Guarda la URL del backend y recarga para que axios tome la nueva baseURL.
 *  ponytail: recarga en vez de recrear el cliente axios; se configura una vez. */
export function setServerUrl(url: string): void {
  try {
    localStorage.setItem(SERVER_URL_KEY, url.trim().replace(/\/+$/, ''))
  } catch {
    /* noop */
  }
  window.location.reload()
}

function resolveApiBaseUrl(): string {
  if (Capacitor.isNativePlatform()) {
    let base = getServerUrl()
    if (!base) return ''
    // Asegurar que tenga protocolo para evitar que axios lo trate como ruta relativa
    if (!base.startsWith('http')) {
      base = `http://${base}`
    }
    return `${base}/api`
  }
  if (import.meta.env.MODE === 'lan' || data.VITE_API_BASE_URL === 'auto') {
    return `${window.location.protocol}//${window.location.hostname}:3000/api`
  }
  return data.VITE_API_BASE_URL
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  googleClientId: data.VITE_GOOGLE_CLIENT_ID,
  isNative: Capacitor.isNativePlatform(),
}
