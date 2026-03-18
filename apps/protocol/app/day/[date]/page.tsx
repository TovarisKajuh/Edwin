import { formatDate, getDateRange } from '@/lib/dates'
import { PROTOCOL_START_WEEK, PROTOCOL_END_WEEK } from '@/data/constants'
import { DayPageClient } from '@/components/day-page-client'

export function generateStaticParams() {
  const params = []
  for (let week = PROTOCOL_START_WEEK; week <= PROTOCOL_END_WEEK; week++) {
    for (const date of getDateRange(week)) {
      params.push({ date: formatDate(date) })
    }
  }
  return params
}

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  return <DayPageClient dateStr={date} />
}
