"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

// If you have Accordion components from shadcn/ui in your setup:
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { ChatMessages, DisplayToolResultsMode } from "../chat-messages"
import JsonView from "@uiw/react-json-view"
import { safeJsonParse } from "@/lib/utils"
import { ChatMessageMarkdown } from "../chat-message-markdown"

// Types for your chunk data. Adjust fields as needed.
export interface Chunk {
  type: string
  name?: string
  startedAt?: string
  finishedAt?: string
  input?: any
  messages?: Array<{
    role: string
    content: Array<{ type: string; text: string }>
    id?: string
  }>
  result?: string | string[]
  response?: string
}

// Props for the DebugLog component
interface DebugLogProps {
  chunks: Chunk[]
}

export function DebugLog({ chunks }: DebugLogProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest chunk whenever `chunks` change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [chunks])

  return (
    <div
      className="border rounded p-2 w-full h-96 overflow-y-auto text-sm"
      ref={containerRef}
    >
      {chunks.map((chunk, index) => {
        // Attempt to derive a date (flowStart => startedAt, flowFinish => finishedAt, etc.)
        const date = chunk.startedAt || chunk.finishedAt || "No date"
        const headerTitle = chunk.name
          ? `${chunk.name} (${chunk.type})`
          : chunk.type

        return (
          <Accordion
            key={index}
            type="single"
            collapsible
            className="mb-2"
          >
            <AccordionItem value={`chunk-${index}`}>
              <AccordionTrigger className="flex items-center justify-between">
                <span className="font-semibold">{headerTitle}</span>
                <span className="ml-2 text-xs text-gray-500">{date}</span>
              </AccordionTrigger>

              <AccordionContent>
                {/* Chunk Details */}
                <div className="mt-2 space-y-2">
                  {/* If the chunk has messages, show them */}
                  {chunk.messages && chunk.messages.length > 0 && (
                    <ChatMessages displayToolResultsMode={DisplayToolResultsMode.AsTextMessage} messages={chunk.messages} />
                  )}

                  {/* If there's a result, show it */}
                  {chunk.result && (
                    <div>
                      <div className="font-semibold">Result:</div>
                      {Array.isArray(chunk.result) ? (
                        <ul className="list-disc list-inside ml-4">
                          {chunk.result.map((r, i) => (
                            <li key={i} className="mt-1 text-gray-600">
                              {r}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-600">{chunk.result}</p>
                      )}
                    </div>
                  )}

                  {/* If there's an input or anything else you want to display */}
                  {chunk.input && (
                    <div>
                      <div className="font-semibold">Input:</div>
                      {(typeof chunk.input === 'string') ? <ChatMessageMarkdown>{chunk.input}</ChatMessageMarkdown> :
                                <JsonView value={safeJsonParse(chunk.input, {})} />}

                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )
      })}
    </div>
  )
}
