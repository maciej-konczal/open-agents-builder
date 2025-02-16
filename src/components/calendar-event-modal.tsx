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
import type { CalendarEvent, Participant } from "@/contexts/calendar-context"
import type { SlotInfo } from "react-big-calendar"

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
  const [participants, setParticipants] = useState<Participant[]>([])
  const [newParticipantName, setNewParticipantName] = useState("")
  const [newParticipantEmail, setNewParticipantEmail] = useState("")

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setStart(event.start)
      setEnd(event.end)
      setExclusive(event.exclusive)
      setDescription(event.description)
      setLocation(event.location)
      setParticipants(event.participants)
    } else if (slotInfo) {
      setStart(slotInfo.start)
      setEnd(slotInfo.end)
    }
  }, [event, slotInfo])

  const handleSave = () => {
    onSave({
      title,
      start,
      end,
      exclusive,
      description,
      location,
      participants,
    })
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
          <DialogTitle>{event ? "Edit Event" : "Create Event"}</DialogTitle>
          <DialogDescription>Make changes to your event here. Click save when you're done.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start" className="text-right">
              Start
            </Label>
            <Input
              id="start"
              type="datetime-local"
              value={start.toISOString().slice(0, 16)}
              onChange={(e) => setStart(new Date(e.target.value))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end" className="text-right">
              End
            </Label>
            <Input
              id="end"
              type="datetime-local"
              value={end.toISOString().slice(0, 16)}
              onChange={(e) => setEnd(new Date(e.target.value))}
              className="col-span-3"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="exclusive"
              checked={exclusive}
              onCheckedChange={(checked) => setExclusive(checked as boolean)}
            />
            <Label htmlFor="exclusive">Exclusive</Label>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
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
              Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right">Participants</Label>
            <div className="col-span-3 space-y-2">
              {participants.map((participant, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span>
                    {participant.name} ({participant.email})
                  </span>
                  <Button variant="destructive" size="sm" onClick={() => handleRemoveParticipant(index)}>
                    Remove
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
                <Button onClick={handleAddParticipant}>Add</Button>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          {event && (
            <Button variant="destructive" onClick={() => onDelete(event.id)}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

