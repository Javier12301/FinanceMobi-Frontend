import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/useAuthStore'

/** Raíz "/": redirige según estado de sesión. */
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/dashboard' })
    }
    throw redirect({ to: '/login' })
  },
})
