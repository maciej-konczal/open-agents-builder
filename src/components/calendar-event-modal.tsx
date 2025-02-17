"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { SlotInfo } from "react-big-calendar"
import { CalendarEvent, Participant } from "@/data/client/models"
import moment from "moment"
import { useTranslation } from "react-i18next"
import {  MessageCircleIcon, PlusIcon, TrashIcon } from "lucide-react"
import Link from "next/link"

interface EventModalProps {
  isOpen: boolean
  event: CalendarEvent | null
  slotInfo: SlotInfo | null
  onClose: () => void
  onSave: (event: Omit<CalendarEvent, "id">) => void
  onDelete: (id: string) => void
}

export default function EventModal({ isOpen, event, slotInfo, onClose, onSave, onDelete }: EventModalProps) {
  const [title, setTitle] = useState("")
  const [start, setStart] = useState<Date>(new Date())
  const [end, setEnd] = useState<Date>(new Date())
  const [exclusive, setExclusive] = useState(false)
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [agentId, setAgentId] = useState("")
  const [participants, setParticipants] = useState<Participant[]>([])
  const [newParticipantName, setNewParticipantName] = useState("")
  const [newParticipantEmail, setNewParticipantEmail] = useState("")
  const { t } = useTranslation()

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setStart(event.start ?? new Date())
      setEnd(event.end ?? new Date())
      setExclusive(event.exclusive ?? false)
      setDescription(event.description ?? '')
      setLocation(event.location ?? '')
      setSessionId(event.sessionId ?? '')
      setAgentId(event.agentId ?? '')
      setParticipants(event.participants ?? [])
    } else if (slotInfo) {
      setStart(slotInfo.start)
      setEnd(slotInfo.end)
    }
  }, [event, slotInfo])

  const handleSave = () => {
    onSave(new CalendarEvent({
      title,
      start,
      end,
      exclusive,
      description,
      location,
      participants,
    }))
  }

  const handleAddParticipant = () => {
    if (newParticipantName && newParticipantEmail) {
      setParticipants([...participants, { name: newParticipantName, email: newParticipantEmail }])
      setNewParticipantName("")
      setNewParticipantEmail("")
    }
  }

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{event ? t("Edit Event") : t("Create Event") }</DialogTitle>
          <DialogDescription>{t("Make changes to your event here. Click save when you're done.")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              {t('Title')}
            </Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start" className="text-right">
              {t('Start')}
            </Label>
            <Input
              id="start"
              type="datetime-local"
              value={moment(start).toISOString(true).slice(0, 16)}
              onChange={(e) => setStart(moment(e.target.value).toDate())}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end" className="text-right">
              {t('End')}
            </Label>
            <Input
              id="end"
              type="datetime-local"
              value={moment(end).toISOString(true).slice(0, 16)}
              onChange={(e) => setEnd(moment(e.target.value).toDate())}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="exclusive" className="text-right">{t('Exclusive')}</Label>
            <Checkbox
              id="exclusive"
              checked={exclusive}
              onCheckedChange={(checked) => setExclusive(checked as boolean)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              {t('Description')}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">
              {t('Location')}
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="col-span-3"
            />
          </div>
          {sessionId && agentId ? (
          <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="session" className="text-right">
            {t('Session')}
          </Label>
          <Link href={'/admin/agent/' + agentId + '/sessions/' + sessionId} className="col-span-3 text-xs hover:underline flex">
            <MessageCircleIcon className="w-4 h-4 mr-2" /> {t('View Session')}</Link>
        </div>

          ): null}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right">{t('Participants')}</Label>
            <div className="col-span-3 space-y-2">
              {participants.map((participant, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-xs">
                    {participant.name} ({participant.email})
                  </span>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => handleRemoveParticipant(index)}>
                    <TrashIcon className="w-4 h4" />{t('Remove')}
                  </Button>
                </div>
              ))}
              <div className="flex space-x-2">
                <Input
                  placeholder="Name"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newParticipantEmail}
                  onChange={(e) => setNewParticipantEmail(e.target.value)}
                />
                <Button onClick={handleAddParticipant}><PlusIcon className="w-4 h-4"/></Button>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          {event && (
            <Button variant="outline" onClick={() => onDelete(event.id)}>
              <TrashIcon className="w-4 h-4" />{t('Delete')}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSave}>{t('Save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

