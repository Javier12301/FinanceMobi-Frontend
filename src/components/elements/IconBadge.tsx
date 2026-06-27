import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IconBadgeProps {
  icon: LucideIcon
  /** 'surface' = fondo gris neutro; 'primary' = fondo teal suave. */
  variant?: 'surface' | 'primary'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const box = {
  sm: 'h-7 w-7 rounded-md',
  md: 'h-9 w-9 rounded-lg',
  lg: 'h-11 w-11 rounded-xl',
}
const iconSize = { sm: 15, md: 18, lg: 20 }

/** Ícono dentro de un cuadrado redondeado (patrón recurrente del prototipo). */
export function IconBadge({ icon: Icon, variant = 'surface', size = 'md', className }: IconBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        box[size],
        variant === 'primary' ? 'bg-primary-soft text-primary' : 'bg-surface text-muted-foreground',
        className,
      )}
    >
      <Icon size={iconSize[size]} />
    </span>
  )
}
