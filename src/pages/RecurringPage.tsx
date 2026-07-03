import { RecurringSection } from '@/features/recurring'

/** Página dedicada de movimientos recurrentes (linkeada desde Ajustes › Gestión). */
export function RecurringPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Movimientos recurrentes</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Gestioná los movimientos que se repiten cada mes: pausalos o eliminalos.
      </p>
      <div className="max-w-2xl">
        <RecurringSection />
      </div>
    </div>
  )
}
