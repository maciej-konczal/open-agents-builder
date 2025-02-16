"use client"

import { CalendarEvent } from "@/data/client/models"
import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { useAgentContext } from "./agent-context"
import { ApiEncryptionConfig } from "@/data/client/admin-api-client"
import { DatabaseContext } from "./db-context"
import { CalendarEventApiClient, DeleteCalendarEventResponse, PutCalendarEventResponse } from "@/data/client/calendar-api-client"
import { SaaSContext } from "./saas-context"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { getErrorMessage } from "@/lib/utils"


interface CalendarContextType {
  events: CalendarEvent[]
  listCalendarEvents: (agentId: string) => Promise<CalendarEvent[]>
  addCalendarEvent: (event: Omit<CalendarEvent, "id">) => Promise<PutCalendarEventResponse>
  updateCalendarEvent: (event: CalendarEvent) => Promise<PutCalendarEventResponse>
  deleteCalendarEvent: (event: CalendarEvent) => Promise<DeleteCalendarEventResponse>
  importEvents: (events: CalendarEvent[]) => Promise<CalendarEvent[]>
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

  const agentContext = useAgentContext()
  const saasContext = useContext(SaaSContext)
  const dbContext = useContext(DatabaseContext)
  const { t } = useTranslation()  

  useEffect(() => {
    if (agentContext.current && agentContext.current.id && agentContext.current.id !== 'new') listCalendarEvents(agentContext.current?.id)
  }, [agentContext.current])


  const setupApiClient = async () => {
      const encryptionConfig: ApiEncryptionConfig = {
          secretKey: dbContext?.masterKey,
          useEncryption: false // TODO: add a env variable config for this
      };
      const client = new CalendarEventApiClient('', dbContext, saasContext, encryptionConfig);
      return client;
  }        
  
  
  const listCalendarEvents = async (agentId: string) => {
      const client = await setupApiClient();
      const response = await client.get(undefined, agentId);
      const events = response.map(e => CalendarEvent.fromDTO(e));
      setEvents(events);
      
      return events;
  }

  const addCalendarEvent = async (event: Omit<CalendarEvent, "id">): Promise<PutCalendarEventResponse> => {
    const newEvent = new CalendarEvent({ ...event, id: uuidv4() });
    const response = await updateCalendarEvent(newEvent)
    if (response.status === 200) {
      setEvents((prev) => [...prev, newEvent])
    }

    return response;
  }

  const updateCalendarEvent = async (updatedEvent: CalendarEvent): Promise<PutCalendarEventResponse> => {
    try {
      const client = await setupApiClient();
      if (agentContext.current?.id && agentContext.current?.id !== 'new')
      {
        updatedEvent.agentId = agentContext.current?.id || '';
        const response = client.put(updatedEvent.toDTO());

        if ((await response).status === 200) {
          setEvents((prev) => prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)))
        } 

        return response;
      } else {
        return { status: 400, message: t("Agent not selecte or not saved. Please save the agent before editing calendar") }
      }
    } catch (e) {
      console.log(e)
      toast.error(t(getErrorMessage(e)))
      return { status: 400, message: getErrorMessage(e) }
    }
  }

  const deleteCalendarEvent = async (event: CalendarEvent): Promise<DeleteCalendarEventResponse> => {
    try {
      const client = await setupApiClient();
      const response = client.delete(event.toDTO());

      if ((await response).status == 200) {
        setEvents((prev) => prev.filter((event) => event.id !== event.id))
      }

      return response;
    } catch (e) {
      console.log(e)
      toast.error(t(getErrorMessage(e)))
      return { status: 400, message: getErrorMessage(e) }
    }
  }

  const importEvents = async (importedEvents: CalendarEvent[]): Promise<CalendarEvent[]> => {
    const client = await setupApiClient();

    importedEvents.forEach(async (event) => {
      const response = await updateCalendarEvent(event);

      if (response.status !== 200) {
        toast.error(response.message)
      }
    });
    
    return events;
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

