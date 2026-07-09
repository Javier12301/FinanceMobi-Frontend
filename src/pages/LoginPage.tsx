import { LoginForm } from '@/features/auth'
import { ServerUrlSection } from '@/components/elements/ServerUrlSection'
import { env } from '@/config/env'

export function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-secondary p-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        {env.isNative && <ServerUrlSection />}
        <LoginForm />
      </div>
    </div>
  )
}
