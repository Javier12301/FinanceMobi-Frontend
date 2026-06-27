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

export const env = {
  apiBaseUrl:
    import.meta.env.MODE === 'lan' || parsed.data.VITE_API_BASE_URL === 'auto'
      ? `${window.location.protocol}//${window.location.hostname}:3000/api`
      : parsed.data.VITE_API_BASE_URL,
  googleClientId: parsed.data.VITE_GOOGLE_CLIENT_ID,
}
