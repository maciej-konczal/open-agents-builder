import { useAgentContext } from "@/contexts/agent-context"
import { DatabaseContext } from "@/contexts/db-context"
import { SaaSContext } from "@/contexts/saas-context"
import { CalendarEventApiClient } from "@/data/client/calendar-api-client"
import { CalendarEvent } from "@/data/client/models"
import { getErrorMessage, getTS } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import { useContext, useEffect, useState } from "react"
import { toast } from "sonner"
import DataLoader from "./data-loader"
import { Button } from "./ui/button"
import { useRouter } from "next/navigation"

export enum CalendarEventsDisplayMode {
    icon = 'icon',
    list = 'list'
}
export function SessionCalendarEvents({ sessionId, displayMode = CalendarEventsDisplayMode.icon }: { sessionId: string, displayMode: CalendarEventsDisplayMode }) {

    const saasContext = useContext(SaaSContext)
    const dbContext = useContext(DatabaseContext)
    const agentContext = useAgentContext()
    const router = useRouter();

    const [events, setEvents] = useState<CalendarEvent[]>([])

    useEffect(() => {
        const client = new CalendarEventApiClient('', dbContext, saasContext, { useEncryption: false })
            client.get({
                sessionId
            }).then(events => {
                setEvents(events.map(e => CalendarEvent.fromDTO(e)));
            }).catch(e => {
                console.error(e)
                toast.error(getErrorMessage(e));
            });
        // fetch events
        }, [sessionId])

    return (
        <div className="flex space-2 mt-2">
            {events ? events.map(evt => 
                (displayMode === CalendarEventsDisplayMode.icon ? (

                    <Button key={evt.id} variant="outline" size="sm" onClick={(e) => {
                        e.preventDefault();
                        router.push('/admin/agent/' + encodeURIComponent(evt.agentId) + '/calendar?eventId=' + encodeURIComponent(evt.id));
                        // open event
                    }}>
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        <div>{evt.start ? getTS(evt.start) : ''}</div>
                    </Button>

                ) : (

                    <Button key={evt.id} variant="outline" size="sm" onClick={(e) => {
                        e.preventDefault();
                        router.push('/admin/agent/' + encodeURIComponent(evt.agentId) + '/calendar?eventId=' + encodeURIComponent(evt.id));
                        // open event
                    }}>
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        <div>{evt.title} - {evt.start ? getTS(evt.start) : ''}</div>
                    </Button>

                ))                
            ) : <DataLoader />}            
        </div>
    )
}