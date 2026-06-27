import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/layouts/MainLayout'
import { useAuthStore } from '@/store/useAuthStore'

/** Layout protegido: todo lo que vive dentro requiere sesión. */
export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: () => (
    <MainLayout>
      <Outlet />
    </MainLayout>
  ),
})
