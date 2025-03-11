"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { HourglassIcon, TimerIcon } from "lucide-react"
import { Chunk } from "@/flows/models"

// Props for the EndUserLog component
interface EndUserLogProps {
  chunks: Chunk[]
}

export function EndUserLog({ chunks }: EndUserLogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  // Auto-scroll to latest chunk whenever `chunks` change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [chunks])

  return (
    <div
      className="border rounded p-2 w-full overflow-y-auto text-sm mt-2"
      ref={containerRef}
    >
      {chunks.map((chunk, index) => {
        const stepNumber = index + 1
        const description = chunk.name || chunk.type
        const date = chunk.timestamp || t("No date")
        const duration = chunk.duration ? `${chunk.duration} s` : null

        return (
          <div key={index} className="mb-2 p-2 border-b">
            <div className="flex justify-between items-center">
              <div className="text-xs">{`Step ${stepNumber}. ${description}`}</div>
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
          </div>
        )
      })}
    </div>
  )
}
