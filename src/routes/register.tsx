import { createFileRoute, redirect } from '@tanstack/react-router'
import { RegisterPage } from '@/pages/RegisterPage'
import { useAuthStore } from '@/store/useAuthStore'

export const Route = createFileRoute('/register')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: RegisterPage,
})
