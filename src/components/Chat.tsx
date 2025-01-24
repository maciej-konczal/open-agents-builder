"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import remarkGfm from 'remark-gfm';
import Markdown from "react-markdown"
import { useTranslation } from "react-i18next"
import styles from './chat.module.css';

export function Chat({ headers, welcomeMessage, displayName, messages, handleInputChange, isLoading, handleSubmit, input  }: { headers: Record<string, string>; displayName: string; welcomeMessage: string; handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void; messages: any[]; isLoading: boolean; handleSubmit: (e: React.FormEvent<HTMLFormElement>, options: { headers: Record<string, string> }) => void; input: string }) {
  const { t } = useTranslation();

  const messagesEndRef = useRef<null | HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages]);


  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{displayName}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[60vh] pr-4">
          <div key='welcome-message' className={`mb-4 text-left`}>
                <span
                  className={`inline-block p-2 rounded-lg bg-muted`}
                >
                  <Markdown className={styles.markdown} remarkPlugins={[remarkGfm]}>{welcomeMessage}</Markdown>
                </span>
              </div>

          {messages.map((m) => (
              <div key={m.id} className={`mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
                <span
                  className={`inline-block p-2 rounded-lg ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <Markdown className={styles.markdown} remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
                </span>
              </div>
          ))}
          {isLoading && (
            <div className="text-left">
              <span className="inline-block p-2 rounded-lg bg-muted">{t('AI is typing...')}</span>
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
          <Input value={input} onChange={handleInputChange} placeholder={t('Type your message...')} className="flex-grow" />
          <Button type="submit" disabled={isLoading}>
            {t('Send')}
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}

