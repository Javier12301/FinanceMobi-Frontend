import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { errorMessage, isNotAvailable } from '@/config/api'
import { ResponsiveModal } from '@/components/elements/ResponsiveModal'
import { EmptyState } from '@/components/elements/EmptyState'
import { useOwnerStore } from '@/store/useOwnerStore'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  categoryMeta,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  type Category,
  type MovementType,
} from '@/features/categories'

const GROUPS: { type: MovementType; label: string }[] = [
  { type: 'EXPENSE', label: 'Gastos' },
  { type: 'INCOME', label: 'Ingresos' },
  { type: 'TRANSFER', label: 'Transferencias' },
]

export function CategoriesPage() {
  const isReadOnly = useOwnerStore((s) => s.isReadOnly)
  const { data: categories, isLoading } = useCategories()
  const del = useDeleteCategory()
  const [editor, setEditor] = useState<{ open: boolean; editing: Category | null }>({ open: false, editing: null })

  const onDelete = (c: Category) =>
    del.mutate(c.id, {
      onSuccess: () => toast.success('Categoría eliminada'),
      onError: (err) =>
        toast.info(isNotAvailable(err) ? 'Eliminar categorías estará disponible próximamente' : errorMessage(err)),
    })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categorías</h1>
        {!isReadOnly && (
          <Button onClick={() => setEditor({ open: true, editing: null })}>
            <Plus size={16} /> Nueva
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !categories || categories.length === 0 ? (
        <EmptyState icon={Plus} title="Sin categorías" description="Creá tu primera categoría." />
      ) : (
        <div className="flex max-w-2xl flex-col gap-6">
          {GROUPS.map(({ type, label }) => {
            const items = categories.filter((c) => c.movementType === type)
            if (items.length === 0) return null
            return (
              <section key={type}>
                <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
                <div className="rounded-xl border bg-card">
                  {items.map((c) => {
                    const meta = categoryMeta(c)
                    return (
                      <div key={c.id} className="flex items-center justify-between border-b px-4 py-3 last:border-b-0">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-full"
                            style={{ backgroundColor: meta.color + '22', color: meta.color }}
                          >
                            <meta.icon size={18} />
                          </span>
                          <span className="text-sm font-medium">{c.name}</span>
                        </div>
                        {!isReadOnly && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditor({ open: true, editing: c })}
                              className="p-1.5 text-muted-foreground hover:text-primary"
                              aria-label="Editar"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => onDelete(c)}
                              className="p-1.5 text-muted-foreground hover:text-destructive"
                              aria-label="Eliminar"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <CategoryEditor
        open={editor.open}
        editing={editor.editing}
        onClose={() => setEditor({ open: false, editing: null })}
      />
    </div>
  )
}

function CategoryEditor({
  open,
  editing,
  onClose,
}: {
  open: boolean
  editing: Category | null
  onClose: () => void
}) {
  const isEdit = !!editing
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const [name, setName] = useState('')
  const [movementType, setMovementType] = useState<MovementType>('EXPENSE')
  const [icon, setIcon] = useState('tag')
  const [color, setColor] = useState(CATEGORY_COLORS[0])

  // Sincroniza al abrir.
  const key = (editing?.id ?? 'new') + String(open)
  const [lastKey, setLastKey] = useState('')
  if (open && key !== lastKey) {
    setLastKey(key)
    setName(editing?.name ?? '')
    setMovementType(editing?.movementType ?? 'EXPENSE')
    setIcon(editing?.icon ?? 'tag')
    setColor(editing?.color ?? CATEGORY_COLORS[0])
  }

  const submit = () => {
    if (!name.trim()) return toast.error('Ingresá un nombre')
    const onErr = (err: unknown) =>
      toast.info(isNotAvailable(err) ? 'Editar categorías estará disponible próximamente' : errorMessage(err))

    if (isEdit) {
      update.mutate(
        { id: editing.id, input: { name: name.trim(), icon, color } },
        { onSuccess: () => { toast.success('Categoría actualizada'); onClose() }, onError: onErr },
      )
    } else {
      create.mutate(
        { name: name.trim(), movementType, icon, color },
        { onSuccess: () => { toast.success('Categoría creada'); onClose() }, onError: (e) => toast.error(errorMessage(e)) },
      )
    }
  }

  return (
    <ResponsiveModal open={open} onOpenChange={(o) => !o && onClose()} title={isEdit ? 'Editar categoría' : 'Nueva categoría'}>
      <div className="flex flex-col gap-3 py-1">
        <div className="space-y-1.5">
          <Label htmlFor="c-name">Nombre</Label>
          <Input id="c-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Supermercado" />
        </div>

        {!isEdit && (
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="grid grid-cols-3 gap-2">
              {GROUPS.map((g) => (
                <button
                  key={g.type}
                  type="button"
                  onClick={() => setMovementType(g.type)}
                  className={cn(
                    'rounded-lg border py-2 text-xs font-medium',
                    movementType === g.type ? 'border-primary bg-primary-soft text-primary' : 'text-muted-foreground',
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Ícono</Label>
          <div className="grid grid-cols-6 gap-2">
            {Object.entries(CATEGORY_ICONS).map(([k, Icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => setIcon(k)}
                className={cn(
                  'flex h-10 items-center justify-center rounded-lg border',
                  icon === k ? 'border-primary bg-primary-soft text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn('h-8 w-8 rounded-full border-2', color === c ? 'border-foreground' : 'border-transparent')}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={create.isPending || update.isPending}>
          {isEdit ? 'Guardar' : 'Crear'}
        </Button>
      </div>
    </ResponsiveModal>
  )
}
