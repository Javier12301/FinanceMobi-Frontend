import { useMemo, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/config/api'
import { useCategories, useCreateCategory, categoryMeta, CATEGORY_ICONS, CATEGORY_COLORS, type MovementType } from '@/features/categories'

interface CategoryPickerProps {
  movementType: MovementType
  value: string
  onChange: (id: string) => void
}

/**
 * Selector unificado de categorías: grilla de iconos + nombre + crear inline.
 * Filtrado por movementType. Buscador visible cuando hay muchas categorías.
 */
export function CategoryPicker({ movementType, value, onChange }: CategoryPickerProps) {
  const { data: allCategories } = useCategories()
  const createCategory = useCreateCategory()

  const [searchQuery, setSearchQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('tag')
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0])

  // Filtrar por movementType
  const filteredByType = useMemo(
    () => allCategories?.filter((c) => c.movementType === movementType) ?? [],
    [allCategories, movementType],
  )

  // Filtrar por búsqueda (case-insensitive por nombre)
  const displayedCategories = useMemo(() => {
    if (!searchQuery.trim()) return filteredByType
    const q = searchQuery.toLowerCase()
    return filteredByType.filter((c) => c.name.toLowerCase().includes(q))
  }, [filteredByType, searchQuery])

  const showSearcher = filteredByType.length > 8

  const onCreate = () => {
    if (!newName.trim()) return
    createCategory.mutate(
      { name: newName.trim(), movementType, icon: newIcon, color: newColor },
      {
        onSuccess: (cat) => {
          onChange(cat.id) // ponytail: seleccionar automáticamente
          setNewName('')
          setNewIcon('tag')
          setNewColor(CATEGORY_COLORS[0])
          setCreating(false)
          toast.success('Categoría creada')
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    )
  }

  return (
    <div className="space-y-2">
      {/* Buscador (solo si hay muchas categorías) */}
      {showSearcher && (
        <Input
          placeholder="Buscar categoría…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10"
        />
      )}

      {/* Grilla de categorías */}
      <div className="grid grid-cols-4 gap-2">
        {displayedCategories.map((c) => {
          const meta = categoryMeta(c)
          const selected = c.id === value
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-medium transition-colors',
                selected ? 'border-primary bg-primary-soft' : 'border-border',
              )}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: meta.color + '22', color: meta.color }}
              >
                {selected ? <Check size={18} /> : <meta.icon size={18} />}
              </span>
              <span className="line-clamp-1 w-full text-center">{c.name}</span>
            </button>
          )
        })}

        {/* Botón + Nueva categoría */}
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="flex flex-col items-center gap-1 rounded-xl border border-dashed p-2 text-[11px] font-medium text-muted-foreground"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface">
            <Plus size={18} />
          </span>
          Nueva
        </button>
      </div>

      {/* Formulario inline de crear categoría */}
      {creating && (
        <div className="space-y-2.5 rounded-xl border bg-surface p-3">
          <div className="flex gap-2">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre de la categoría"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onCreate()
                }
              }}
            />
            <Button type="button" onClick={onCreate} disabled={createCategory.isPending}>
              Crear
            </Button>
          </div>

          {/* Selector de ícono */}
          <div className="grid grid-cols-7 gap-1.5">
            {Object.entries(CATEGORY_ICONS).map(([k, Icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => setNewIcon(k)}
                className={cn(
                  'flex h-8 items-center justify-center rounded-lg border transition-colors',
                  newIcon === k
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>

          {/* Selector de color */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={cn('h-6 w-6 rounded-full border-2', newColor === c ? 'border-foreground' : 'border-transparent')}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
