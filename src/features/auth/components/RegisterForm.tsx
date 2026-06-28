import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/config/api'
import { useRegister } from '../api/useRegister'

export function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const register = useRegister()

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  const pwdOk = password.length >= 8
  const matchOk = password === confirm

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!emailOk) return toast.error('Ingresá un email válido')
    if (!pwdOk) return toast.error('La contraseña debe tener al menos 8 caracteres')
    if (!matchOk) return toast.error('Las contraseñas no coinciden')
    register.mutate({ name, email, password }, { onError: (err) => toast.error(errorMessage(err)) })
  }

  return (
    <div className="w-full max-w-[420px] rounded-xl border bg-card p-8 shadow-sm sm:p-10">
      <div className="mb-7 text-center">
        <div className="text-[28px] font-semibold tracking-tight text-primary">FinanceMobile</div>
        <div className="mt-1 text-sm text-muted-foreground">Creá tu cuenta</div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" placeholder="Ej: Javier López" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={email.length > 0 && !emailOk}
          />
          {email.length > 0 && !emailOk && <p className="text-xs text-destructive">Ingresá un email válido</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pr-10"
              aria-invalid={password.length > 0 && !pwdOk}
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
          {password.length > 0 && !pwdOk && <p className="text-xs text-destructive">Mínimo 8 caracteres</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirmar contraseña</Label>
          <Input
            id="confirm"
            type={showPwd ? 'text' : 'password'}
            placeholder="Repetí tu contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            aria-invalid={confirm.length > 0 && !matchOk}
          />
          {confirm.length > 0 && !matchOk && (
            <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
          )}
        </div>

        <Button type="submit" disabled={register.isPending} className="mt-0.5 w-full">
          {register.isPending ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>

      <div className="mt-5 text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="font-medium text-primary">
          Iniciá sesión
        </Link>
      </div>
    </div>
  )
}
