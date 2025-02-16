"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Calendar, momentLocalizer, type SlotInfo } from "react-big-calendar"
import moment from "moment"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useCalendar } from "@/contexts/calendar-context"
import EventModal from "./calendar-event-modal"
import { CalendarEvent } from "@/data/client/models"

const localizer = momentLocalizer(moment)

export default function Scheduler() {
  const { events, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, importEvents } = useCalendar()
  const [newEventTitle, setNewEventTitle] = useState("")
  const [newEventExclusive, setNewEventExclusive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null)

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setSelectedSlot(slotInfo)
    setShowModal(true)
  }, [])

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowModal(true)
  }, [])

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedEvent(null)
    setSelectedSlot(null)
  }

  const handleSaveEvent = (event: Omit<CalendarEvent, "id">) => {
    if (selectedEvent) {
      updateCalendarEvent({ ...event, id: selectedEvent.id })
    } else {
      addCalendarEvent(event)
    }
    handleCloseModal()
  }

  const handleDeleteEvent = (id: string) => {
    deleteCalendarEvent(id)
    handleCloseModal()
  }

  const moveEvent = useCallback(
    ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
      updateCalendarEvent({ ...event, start, end })
    },
    [updateCalendarEvent],
  )

  const handleAddEvent = () => {
    if (newEventTitle) {
      addCalendarEvent({
        title: newEventTitle,
        start: new Date(),
        end: new Date(new Date().setHours(new Date().getHours() + 1)),
        exclusive: newEventExclusive,
        description: "",
        location: "",
        participants: [],
      })
      setNewEventTitle("")
      setNewEventExclusive(false)
    }
  }

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(events)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = "calendar_events.json"
    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader()
    fileReader.readAsText(event.target.files![0], "UTF-8")
    fileReader.onload = (e) => {
      const content = e.target?.result as string
      try {
        const importedEvents = JSON.parse(content, (key, value) => {
          if (key === "start" || key === "end") {
            return new Date(value)
          }
          return value
        })
        importEvents(importedEvents)
      } catch (error) {
        console.error("Error parsing JSON:", error)
        alert("Error importing events. Please check the file format.")
      }
    }
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    const style: React.CSSProperties = {
      backgroundColor: event.exclusive ? "#f87171" : "#60a5fa",
      borderRadius: "5px",
      opacity: 0.8,
      color: "white",
      border: "0px",
      display: "block",
    }
    return {
      style: style,
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="mb-4 flex space-x-2">
        <div className="flex-grow">
          <Label htmlFor="new-event">Quick Add Event</Label>
          <div className="flex space-x-2">
            <Input
              id="new-event"
              type="text"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              placeholder="Enter event title"
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exclusive"
                checked={newEventExclusive}
                onCheckedChange={(checked) => setNewEventExclusive(checked as boolean)}
              />
              <Label htmlFor="exclusive">Exclusive</Label>
            </div>
            <Button onClick={handleAddEvent}>Add Event</Button>
          </div>
        </div>
        <div className="flex items-end space-x-2">
          <Button onClick={handleExportJSON} className="text-sm">Export to JSON</Button>
          <label className="text-sm cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Import from JSON
            <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
          </label>
        </div>
      </div>
      <div className="flex-grow">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onEventDrop={moveEvent}
          selectable
          resizable
          eventPropGetter={eventStyleGetter}
        />
      </div>
      <EventModal
        isOpen={showModal}
        event={selectedEvent}
        slotInfo={selectedSlot}
        onClose={handleCloseModal}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  )
}

