import { useState } from 'react'
import { MoreHorizontal, Check } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useCategories } from '../api/useCategories'
import { categoryMeta } from '../categoryMeta'
import { CategoryPicker } from './CategoryPicker'
import type { MovementType } from '../types/category'

interface CompactCategoryRowProps {
  movementType: MovementType
  value: string
  onChange: (id: string) => void
}

/**
 * Selector de categoría en UNA sola línea: chips scrollables + botón "⋯" que abre el
 * CategoryPicker completo (grid + crear) en un Sheet. Evita el scroll vertical que
 * introducía el grid siempre visible dentro del form de movimiento.
 */
export function CompactCategoryRow({ movementType, value, onChange }: CompactCategoryRowProps) {
  const { data: allCategories } = useCategories()
  const [open, setOpen] = useState(false)
  const categories = allCategories?.filter((c) => c.movementType === movementType) ?? []

  return (
    <div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => {
          const meta = categoryMeta(c)
          const selected = c.id === value
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border py-1.5 pl-1.5 pr-3 text-xs font-medium transition-colors',
                selected ? 'border-primary bg-primary-soft text-primary' : 'border-border text-foreground',
              )}
            >
              <span
                className="flex size-6 items-center justify-center rounded-full"
                style={{ backgroundColor: meta.color + '22', color: meta.color }}
              >
                {selected ? <Check size={13} /> : <meta.icon size={13} />}
              </span>
              {c.name}
            </button>
          )
        })}

        {/* Abre el picker completo (grid + crear categoría) */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border py-1.5 px-3 text-xs font-medium text-muted-foreground"
        >
          <MoreHorizontal size={15} />
          Más
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[80dvh] overflow-y-auto overflow-x-hidden rounded-t-2xl px-4 pb-6"
        >
          <SheetTitle className="mb-3">Elegí una categoría</SheetTitle>
          <CategoryPicker
            movementType={movementType}
            value={value}
            onChange={(id) => {
              onChange(id)
              setOpen(false)
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
