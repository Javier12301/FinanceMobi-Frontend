import type { ReactNode } from 'react'
import { useOwnerStore } from '@/store/useOwnerStore'

interface PageHeaderProps {
  title: string
  action?: ReactNode
}

/** Encabezado de página con título y, si hay delegación activa, el chip de contexto. */
export function PageHeader({ title, action }: PageHeaderProps) {
  const delegation = useOwnerStore((s) => s.delegation)
  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {delegation && (
          <span className="mt-1 inline-block rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-medium text-primary">
            Viendo cuenta de {delegation.ownerName}
          </span>
        )}
      </div>
      {action}
    </div>
  )
}
