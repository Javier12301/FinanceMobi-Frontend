import { Bell } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useNotificationPrefs, useUpdateNotificationPrefs } from '../api/useNotificationPrefs'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</div>
}

export function NotificationsSection() {
  const { data: prefs } = useNotificationPrefs()
  const { mutate: update } = useUpdateNotificationPrefs()

  // endpoint dormido o sin prefs → ocultar sección
  if (!prefs) return null

  return (
    <section>
      <SectionLabel>Notificaciones</SectionLabel>
      <div className="divide-y rounded-xl border bg-card">
        <PrefRow
          icon={<Bell size={16} className="text-muted-foreground" />}
          label="Recordatorio diario"
          description={`Aviso a las ${prefs.reminderHour} para cargar tus gastos`}
          checked={prefs.dailyReminder}
          onCheckedChange={(v) => update({ dailyReminder: v })}
        />
        <PrefRow
          label="Alertas de presupuesto"
          description="Aviso cuando superás el 80% o 100% de un presupuesto"
          checked={prefs.budgetAlerts}
          onCheckedChange={(v) => update({ budgetAlerts: v })}
        />
        <PrefRow
          label="Alertas de recurrentes"
          description="Aviso cuando hay movimientos pendientes de confirmar"
          checked={prefs.recurringAlerts}
          onCheckedChange={(v) => update({ recurringAlerts: v })}
        />
      </div>
    </section>
  )
}

function PrefRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon?: React.ReactNode
  label: string
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-2.5">
        {icon ?? <div className="h-4 w-4" />}
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
