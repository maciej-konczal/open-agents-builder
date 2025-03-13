"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { HourglassIcon, TimerIcon } from "lucide-react"
import { Chunk } from "@/flows/models"
import { ChatMessageMarkdown } from "../chat-message-markdown"
import { safeJsonParse } from "@/lib/utils"
import { ChatMessageToolResponse } from "../chat-message-tool-response"

// Props for the EndUserLog component
interface EndUserLogProps {
  chunks: Chunk[],
  accumulatedTextGens: Record<string, string>
}

export function EndUserLog({ chunks, accumulatedTextGens }: EndUserLogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  // Auto-scroll to latest chunk whenever `chunks` change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [chunks, accumulatedTextGens])

  return (
    <div
      className="border rounded p-2 w-full overflow-y-auto text-sm mt-2"
      ref={containerRef}
    >
      {chunks.filter(ch=>['generation', 'toolCalls'].includes(ch.type) ).map((chunk, index) => {
        const stepNumber = index + 1
        const description = chunk.name || chunk.type
        const date = chunk.timestamp || t("No date")
        const duration = chunk.duration ? `${chunk.duration} s` : null

        return (
          <div key={index} className="mb-2 p-2 border-b text-xs">
            {chunk.type !== "message" && chunk.type !== "error" && (
            <div className="flex justify-between items-center">
                <div className="text-xs mb-2 font-bold">{`Step ${stepNumber}. ${description}`}</div>
                <div className="text-xs text-gray-500 flex items-center">
                  {duration && (
                    <div className="flex ml-2 text-gray-500">
                      <TimerIcon className="w-4 h-4 mr-2 ml-2" /> ({duration})
                    </div>
                  )}
                  {chunk.type !== "error" && chunk.type !== "finalResult" && index === chunks.length - 1 && (
                    <div className="p-2 items-center justify-center">
                      <HourglassIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
            </div>
      )}

        {accumulatedTextGens && chunk['type'] === 'generation' && chunk.flowNodeId && (
          accumulatedTextGens[chunk.flowNodeId] ? (<ChatMessageMarkdown>{accumulatedTextGens[chunk.flowNodeId]}</ChatMessageMarkdown>) : (t('AI Thinking') + '...')
        )}

        { chunk.toolResults && (
          chunk.toolResults.map((c, i) => (
            safeJsonParse(c.result, null) === null ? <ChatMessageMarkdown>{c.result}</ChatMessageMarkdown> :
            <ChatMessageToolResponse key={i} args={c.args} result={safeJsonParse(c.result, null)} />
          ))


        )}



        {chunk.type === "message" && (
              <div className="flex justify-between items-center">
                <ChatMessageMarkdown>{chunk.message}</ChatMessageMarkdown>
              </div>
        )}      

          </div>
        )
      })}
    </div>
  )
}
