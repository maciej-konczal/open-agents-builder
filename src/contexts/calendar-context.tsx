"use client"

import { CalendarEvent } from "@/data/client/models"
import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"

interface CalendarContextType {
  events: CalendarEvent[]
  listCalendarEvents: () => CalendarEvent[]
  addCalendarEvent: (event: Omit<CalendarEvent, "id">) => void
  updateCalendarEvent: (event: CalendarEvent) => void
  deleteCalendarEvent: (id: string) => void
  importEvents: (events: CalendarEvent[]) => void
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined)

export const useCalendar = () => {
  const context = useContext(CalendarContext)
  if (!context) {
    throw new Error("useCalendar must be used within a CalendarProvider")
  }
  return context
}

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([])

  useEffect(() => {
    const storedEvents = localStorage.getItem("calendarEvents")
    if (storedEvents) {
      setEvents(
        JSON.parse(storedEvents, (key, value) => {
          if (key === "start" || key === "end") {
            return new Date(value)
          }
          return value
        }),
      )
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("calendarEvents", JSON.stringify(events))
  }, [events])

  const listCalendarEvents = () => events

  const addCalendarEvent = (event: Omit<CalendarEvent, "id">) => {
    const newEvent = { ...event, id: uuidv4() }
    setEvents((prev) => [...prev, newEvent])
  }

  const updateCalendarEvent = (updatedEvent: CalendarEvent) => {
    setEvents((prev) => prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)))
  }

  const deleteCalendarEvent = (id: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== id))
  }

  const importEvents = (importedEvents: CalendarEvent[]) => {
    setEvents(importedEvents)
  }

  return (
    <CalendarContext.Provider
      value={{
        events,
        listCalendarEvents,
        addCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        importEvents,
      }}
    >
      {children}
    </CalendarContext.Provider>
  )
}

