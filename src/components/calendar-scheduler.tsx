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
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { getCurrentTS } from "@/lib/utils"
import { useAgentContext } from "@/contexts/agent-context"
import { CalendarEventDTO } from "@/data/dto"
import { v4 as uuidv4 } from "uuid"
import { useFilePicker } from "use-file-picker"
import { ImportIcon, PlusIcon, Share2Icon, ShareIcon } from "lucide-react"


const localizer = momentLocalizer(moment);

export default function Scheduler() {
  const { events, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, importEvents } = useCalendar()
  const [newEventTitle, setNewEventTitle] = useState("")
  const [newEventExclusive, setNewEventExclusive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null)

  const agentContext = useAgentContext();
  const { t } = useTranslation()

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
      updateCalendarEvent(new CalendarEvent({ ...event, id: selectedEvent.id }))
    } else {
      addCalendarEvent(new CalendarEvent({ ...event, id: uuidv4() }))
    }
    handleCloseModal()
  }

  const handleDeleteEvent = (id: string) => {
    deleteCalendarEvent(events.find((event) => event.id === id)!)
    handleCloseModal()
  }

  const moveEvent = useCallback(
    async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
      const response = await updateCalendarEvent(new CalendarEvent({ ...event, start, end } as CalendarEvent))
      if (response.status !== 200) {
        toast.error(t(response.message));
      } 
    },
    [updateCalendarEvent],
  )

  const handleAddEvent = () => {
    if (newEventTitle && agentContext.current && agentContext.current.id && agentContext.current.id !== "new") {
      addCalendarEvent(new CalendarEvent({
        id: uuidv4(),
        agentId: agentContext.current?.id,
        title: newEventTitle,
        start: new Date().toISOString(),
        end: new Date(new Date().setHours(new Date().getHours() + 1)).toISOString(),
        exclusive: newEventExclusive,
        description: "",
        location: "",
        participants: "[]",
        updatedAt: getCurrentTS(),
        createdAt: getCurrentTS()
      } as CalendarEventDTO))
      setNewEventTitle("")
      setNewEventExclusive(false)
    } else {
      toast.error(t('Please save the current agent and provide the event title first'));
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

  const { openFilePicker, filesContent, loading } = useFilePicker({
    accept: '.json',
    readAs: 'Text',
    onFilesSuccessfullySelected: async () => {
      filesContent.map(async (fileContent) => {

        try {
          const importedEvents = JSON.parse(fileContent.content, (key, value) => {
            if (key === "start" || key === "end") {
              return moment(value).toDate()
            }
            return value
          })
          await importEvents(importedEvents.map((event: CalendarEventDTO) => {
            const itm = new CalendarEvent(event.id ? event : { ...event, id: uuidv4() })
            return itm;
        }))
        toast.info(t('Events imported successfully'))
        } catch (error) {
          console.error("Error parsing JSON:", error)
          toast.error(t("Error importing events. Please check the file format."))
        }
      });

    }
  });

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
      <div className="flex space-x-2 mb-4">
          <Button variant={"outline"} size="sm" onClick={handleExportJSON} className="text-xs"><ShareIcon className="w-4 h-4 mr-2"/> {t('Export to JSON')}</Button>
          <Button variant={"outline"} size="sm" className="text-xs" onClick={(e) => openFilePicker() }>
          <ImportIcon className="w-4 h-4 mr-2"/> {t('Import from JSON')}
          </Button>
       </div>

      <div className="mb-4 flex space-x-2">
        <div className="flex-grow">
          <div className="flex space-x-2">
            <Input
              id="new-event"
              type="text"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              placeholder={t('Enter event title')}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exclusive"
                checked={newEventExclusive}
                onCheckedChange={(checked) => setNewEventExclusive(checked as boolean)}
              />
              <Label className="text-xs" htmlFor="exclusive">{t('Exclusive')}</Label>
            </div>
            <Button size="sm" variant="outline" className="text-xs" onClick={handleAddEvent}><PlusIcon className="w-4 h-4 mr-2" />{t('Add Event')}</Button>
          </div>
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
          selectable
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

