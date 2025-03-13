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
import { BrainCircuitIcon, BrainCogIcon, BrainIcon, CodeIcon, CogIcon, FileCogIcon, HashIcon, HourglassIcon, LightbulbIcon, StepForwardIcon, TextCursorIcon, TextCursorInputIcon, TextIcon, TimerIcon } from "lucide-react"
import { DataLoaderIcon } from "../data-loader-icon"
import { ChatMessageToolResponse } from "../chat-message-tool-response"
import { DebugChatMessages } from "../debug-chat-messages"

// Types for your chunk data. Adjust fields as needed.

// Props for the DebugLog component
interface DebugLogProps {
  chunks: Chunk[],
  accumulatedTextGens: Record<string, string>
}

export function DebugLog({ chunks, accumulatedTextGens }: DebugLogProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const [openChunks, setOpenChunks] = React.useState<string[]>([])
  const { t } = useTranslation();

  // Auto-scroll to latest chunk whenever `chunks` change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
    setOpenChunks(prv=> [...prv, `chunk-${chunks.length-1}`])
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

        let chunkIcon = (<LightbulbIcon className="w-4 h-4 mr-2 ml-2" />)
        if (chunk.type === "generation") chunkIcon = (<TextCursorInputIcon className="w-4 h-4 mr-2 ml-2" />)
        if (chunk.type === "toolCalls") chunkIcon = (<FileCogIcon className="w-4 h-4 mr-2 ml-2" />)

        return (
          <Accordion
            key={index}
            onValueChange={(values) => setOpenChunks(values)}
            value={openChunks}
            type="multiple"
            className="mb-2"
          >
            <AccordionItem value={`chunk-${index}`}>
              <AccordionTrigger>
                <div className="grid grid-cols-2 w-full">
                  <div className="items-center no-underline text-left justify-start font-normal flex">{chunkIcon} {index + 1}. <span className="font-normal dark:text-white p-2 bg-gray-500 rounded-md mr-2">{chunk.type}</span> <span className="font-bold">{chunk.name}</span></div>
                  <div className="ml-2 text-xs text-gray-500 flex items-center">{date}
                    {chunk.duration && (
                      <div className="flex ml-2 text-gray-500"><TimerIcon className="w-4 h-4 mr-2 ml-2" /> ({chunk.duration} s)</div>
                    )}
                    {chunk.type !== "error" && chunk.type !== "finalResult" && index == chunks.length - 1 && (
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
                    <DebugChatMessages displayToolResultsMode={DisplayToolResultsMode.AsTextMessage} messages={chunk.messages} />
                  )}

                  {chunk.message && (
                    <div className={chunk.type === 'error' ? "text-red-500" : ''}>
                      <ChatMessageMarkdown>{chunk.message}</ChatMessageMarkdown>
                    </div>
                  )}

                  {accumulatedTextGens && chunk['type'] === 'generation' && chunk.flowNodeId  && (
                    accumulatedTextGens[chunk.flowNodeId] ?  (<ChatMessageMarkdown>{accumulatedTextGens[chunk.flowNodeId]}</ChatMessageMarkdown>) : (<div className="flex"><BrainIcon className="w-4 h-4 mr-2"/>{t('AI Thinking') + '...' }</div>)
                  )}

                  { chunk.toolResults && (
                    chunk.toolResults.map((c, i) => (
                      safeJsonParse(c.result, null) === null ? <ChatMessageMarkdown>{c.result}</ChatMessageMarkdown> :
                      <ChatMessageToolResponse args={c.args} result={safeJsonParse(c.result, null)} />
                    ))


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
                      {(typeof chunk.input === 'string') ? (safeJsonParse(chunk.input, null) === null ? <ChatMessageMarkdown>{chunk.input}</ChatMessageMarkdown> : <DebugChatMessages messages={[JSON.parse(chunk.input)]} displayToolResultsMode={DisplayToolResultsMode.AsTextMessage} displayTimestamps={false} />) :
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
