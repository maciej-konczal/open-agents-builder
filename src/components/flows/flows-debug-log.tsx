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
import { useTranslation } from "react-i18next"
import { Chunk } from "@/flows/models"
import Markdown from "react-markdown"
import { HourglassIcon, TimerIcon } from "lucide-react"
import { DataLoaderIcon } from "../data-loader-icon"

// Types for your chunk data. Adjust fields as needed.

// Props for the DebugLog component
interface DebugLogProps {
  chunks: Chunk[]
}

export function DebugLog({ chunks }: DebugLogProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { t } = useTranslation();
  
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
        const date = chunk.timestamp || t("No date")
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
              <AccordionTrigger>
                <div className="grid grid-cols-2 w-full">
                  <div className="font-semibold items-left text-left justify-start">{index+1}. {headerTitle}</div>
                  <div className="ml-2 text-xs text-gray-500 flex items-center">{date}
                  {chunk.duration && (
                    <div className="flex ml-2 text-gray-500"><TimerIcon className="w-4 h-4 mr-2 ml-2"/> ({chunk.duration} s)</div>
                  )}
                  {chunk.type !== "error" && chunk.type !== "finalResult" && index == chunks.length-1 && (
                    <div className="p-2 items-center justify-center"><HourglassIcon className="w-4 h-4 " /></div>
                  )}
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                {/* Chunk Details */}
                <div className="mt-2 space-y-2">
                  {/* If the chunk has messages, show them */}
                  {chunk.messages && chunk.messages.length > 0 && (
                    <ChatMessages displayToolResultsMode={DisplayToolResultsMode.AsTextMessage} messages={chunk.messages} />
                  )}

                  {chunk.message && (
                    <div className={chunk.type === 'error' ? "text-red-500" : ''}>
                        <ChatMessageMarkdown>{chunk.message}</ChatMessageMarkdown>
                    </div>
                  )}

                  {/* If there's a result, show it */}
                  {chunk.result && (
                    <div>
                      <div className="font-semibold">{t('Result')}</div>
                      {Array.isArray(chunk.result) ? (
                        <ul className="list-disc list-inside ml-4">
                          {chunk.result.map((r, i) => (
                            <li key={i} className="mt-1 text-gray-600">
                              {r}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <ChatMessageMarkdown>{chunk.result}</ChatMessageMarkdown>
                      )}
                    </div>
                  )}

                  {/* If there's an input or anything else you want to display */}
                  {chunk.input && ((typeof chunk.input === 'string' && chunk.input !== "") && Object.values(chunk.input).length > 0) && (
                    <div>
                      <div className="font-semibold">{t('Input')}</div>
                      {(typeof chunk.input === 'string') ? (safeJsonParse(chunk.input, null) === null ? <ChatMessageMarkdown>{chunk.input}</ChatMessageMarkdown>: <ChatMessages messages={[JSON.parse(chunk.input)]} displayToolResultsMode={DisplayToolResultsMode.AsTextMessage} displayTimestamps={false} />) :
                                (chunk.input ? <JsonView value={safeJsonParse(chunk.input, {})} /> : null)}

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
