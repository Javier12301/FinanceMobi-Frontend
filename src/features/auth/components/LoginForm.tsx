import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/config/api'
import { useLogin } from '../api/useLogin'
import { useGoogleLogin } from '../api/useGoogleLogin'
import { requestGoogleIdToken } from '../api/googleIdentity'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const login = useLogin()
  const googleLogin = useGoogleLogin()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate({ email, password }, { onError: (err) => toast.error(errorMessage(err)) })
  }

  const onGoogle = async () => {
    try {
      const idToken = await requestGoogleIdToken()
      googleLogin.mutate({ idToken }, { onError: (err) => toast.error(errorMessage(err)) })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo iniciar con Google')
    }
  }

  const loading = login.isPending || googleLogin.isPending

  return (
    <div className="w-full max-w-[420px] rounded-xl border bg-card p-8 shadow-sm sm:p-10">
      <div className="mb-8 text-center">
        <div className="text-[28px] font-semibold tracking-tight text-primary">FinanceVier</div>
        <div className="mt-1 text-sm text-muted-foreground">Gestioná tus finanzas personales</div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <div className="relative">
          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="pl-10"
          />
        </div>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type={showPwd ? 'text' : 'password'}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="px-10"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        <Button type="submit" disabled={loading} className="mt-0.5 w-full">
          {login.isPending ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-2.5 text-sm text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>o</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button type="button" variant="outline" onClick={onGoogle} disabled={loading} className="w-full gap-2.5">
        <span className="bg-gradient-to-br from-[#4285F4] via-[#EA4335] to-[#34A853] bg-clip-text text-base font-bold text-transparent">
          G
        </span>
        Continuar con Google
      </Button>

      <div className="mt-5 text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{' '}
        <Link to="/register" className="font-medium text-primary">
          Registrate
        </Link>
      </div>
    </div>
  )
}
