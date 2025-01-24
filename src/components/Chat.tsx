"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useChat } from "ai/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useChatContext } from "@/contexts/chat-context"
import { nanoid } from "nanoid"
import Markdown from "react-markdown"
import { useTranslation } from "react-i18next"
import styles from './chat.module.css';
import { get } from "http"


export function Chat({ apiUrl, headers }: { apiUrl: string; headers: Record<string, string> }) {
  const { messages, append, input, setMessages, handleInputChange, handleSubmit, isLoading } = useChat({
    api: apiUrl,
  })

  const chatContext = useChatContext();
  const { t } = useTranslation();

  const messagesEndRef = useRef<null | HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages]);


  useEffect(() => {
    if (chatContext.agent){
      append({
        id: nanoid(),
        role: "user",
        content: t("Lets chat")
      }, {
        headers
      })
    }
  }, [chatContext.agent]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{chatContext.agent?.displayName}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[60vh] pr-4">
          <div key='welcomer-message' className={`mb-4 text-left`}>
                <span
                  className={`inline-block p-2 rounded-lg bg-muted`}
                >
                  <Markdown className={styles.markdown}>{chatContext.agent?.options?.welcomeMessage}</Markdown>
                </span>
              </div>

          {messages.map((m) => (
              <div key={m.id} className={`mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
                <span
                  className={`inline-block p-2 rounded-lg ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <Markdown className={styles.markdown}>{m.content}</Markdown>
                </span>
              </div>
          ))}
          {isLoading && (
            <div className="text-left">
              <span className="inline-block p-2 rounded-lg bg-muted">AI is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={e=> {
          handleSubmit(e, {
            headers
          })
        }} className="flex w-full space-x-2">
          <Input value={input} onChange={handleInputChange} placeholder="Type your message..." className="flex-grow" />
          <Button type="submit" disabled={isLoading}>
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}

