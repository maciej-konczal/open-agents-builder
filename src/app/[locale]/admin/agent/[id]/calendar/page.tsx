"use client"

import Scheduler from "@/components/calendar-scheduler"
import { CalendarProvider } from "@/contexts/calendar-context"

export default function Calendar() {
  return (
    <CalendarProvider>
        <div className="space-y-6">
            <Scheduler />
      </div>
    </CalendarProvider>
  )
}

