import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TypeSegmentOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
  /** Clases del estado activo (borde + fondo + texto), ej: 'border-destructive bg-destructive/10 text-destructive'. */
  activeClass: string
  /** Texto secundario (solo se muestra en variant="card"). */
  hint?: string
}

interface TypeSegmentProps<T extends string> {
  options: TypeSegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  /**
   * - `chip`: fila compacta con icono (Gasto/Ingreso/Transf.).
   * - `card`: bloque con label + hint (Debo/Me deben).
   */
  variant?: 'chip' | 'card'
  className?: string
}

/**
 * Segmented control compartido entre movimiento y deuda: un solo componente configurable
 * en vez del markup duplicado que había en cada form.
 * ponytail: si un cuarto uso no encaja, se parametriza más — no se abstrae de más.
 */
export function TypeSegment<T extends string>({
  options,
  value,
  onChange,
  variant = 'chip',
  className,
}: TypeSegmentProps<T>) {
  // ponytail: clases estáticas — Tailwind no genera `grid-cols-${n}` dinámico
  const cols = options.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
  return (
    <div
      role="tablist"
      className={cn('grid gap-2', cols, className)}
    >
      {options.map((opt) => {
        const active = value === opt.value
        const Icon = opt.icon
        if (variant === 'card') {
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex items-start gap-2 rounded-xl border-2 p-3 text-left transition-colors',
                active ? opt.activeClass : 'border-transparent bg-surface text-muted-foreground',
              )}
            >
              {Icon && (
                <span className="mt-0.5 shrink-0">
                  <Icon size={18} />
                </span>
              )}
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{opt.label}</span>
                {opt.hint && <span className="mt-0.5 block text-[11px] font-normal leading-tight">{opt.hint}</span>}
              </span>
            </button>
          )
        }
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-xl border-2 py-2 text-xs font-semibold transition-colors [@media(max-height:640px)]:py-1',
              active ? opt.activeClass : 'border-transparent bg-surface text-muted-foreground',
            )}
          >
            {Icon && <Icon size={15} />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
