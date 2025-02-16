"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import type { CalendarEvent, Participant } from "@/contexts/calendar-context"
import type { SlotInfo } from "react-big-calendar"

interface EventModalProps {
  event: CalendarEvent | null
  slotInfo: SlotInfo | null
  onClose: () => void
  onSave: (event: Omit<CalendarEvent, "id">) => void
  onDelete: (id: string) => void
}

export default function EventModal({ event, slotInfo, onClose, onSave, onDelete }: EventModalProps) {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">{event ? "Edit Event" : "Create Event"}</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="start">Start</Label>
            <Input
              id="start"
              type="datetime-local"
              value={start.toISOString().slice(0, 16)}
              onChange={(e) => setStart(new Date(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="end">End</Label>
            <Input
              id="end"
              type="datetime-local"
              value={end.toISOString().slice(0, 16)}
              onChange={(e) => setEnd(new Date(e.target.value))}
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
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <Label>Participants</Label>
            <div className="space-y-2">
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
            </div>
            <div className="flex space-x-2 mt-2">
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
        <div className="flex justify-end space-x-2 mt-4">
          {event && (
            <Button variant="destructive" onClick={() => onDelete(event.id)}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  )
}

