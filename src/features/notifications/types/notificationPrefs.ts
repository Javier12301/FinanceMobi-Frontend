export interface NotificationPrefs {
  id: string
  userId: string
  dailyReminder: boolean
  budgetAlerts: boolean
  recurringAlerts: boolean
  reminderHour: string // "HH:mm"
  createdAt: string
  updatedAt: string
}

export interface UpdateNotificationPrefsInput {
  dailyReminder?: boolean
  budgetAlerts?: boolean
  recurringAlerts?: boolean
  reminderHour?: string
}
