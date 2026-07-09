import { createFileRoute } from '@tanstack/react-router'
import { RecurringPage } from '@/pages/RecurringPage'

export const Route = createFileRoute('/_app/recurring')({
  component: RecurringPage,
})
