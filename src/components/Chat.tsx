"use client"

import { useEffect, useRef, useState } from "react"
import { useChat } from "ai/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useChatContext } from "@/contexts/chat-context"
import { nanoid } from "nanoid"
import Markdown from "react-markdown"

export function Chat() {
  const { messages, append, input, setMessages, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  })

  const chatContext = useChatContext();

  const messagesEndRef = useRef<null | HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages]);


  useEffect(() => {
    if (chatContext.agent){
      setMessages([...messages, {
          id: nanoid(),
          role: "assistant",
          content: chatContext.agent?.options?.welcomeMessage || ''
        }]);
        append(
        {
          id: nanoid(),
          role: "user",
          content: chatContext.agent?.prompt || ''
        })
    }
  }, [chatContext.agent]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Chat with AI</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[60vh] pr-4">
          {messages.map((m) => (
              <div key={m.id} className={`mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
                <span
                  className={`inline-block p-2 rounded-lg ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <Markdown>{m.content}</Markdown>
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
        <form onSubmit={handleSubmit} className="flex w-full space-x-2">
          <Input value={input} onChange={handleInputChange} placeholder="Type your message..." className="flex-grow" />
          <Button type="submit" disabled={isLoading}>
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}

