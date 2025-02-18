import { Message } from "ai";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from './chat.module.css';
import { useTranslation } from "react-i18next";
import { TimerIcon } from "lucide-react";
import JsonView from "@uiw/react-json-view";

export enum DisplayToolResultsMode {
    None = 'none',
    AsTextMessage = 'textmessage'
}
export function ChatMessages({ messages, displayToolResultsMode = DisplayToolResultsMode.None, displayTimestamps = false  }: { messages: Message[], displayToolResultsMode?: DisplayToolResultsMode, displayTimestamps: boolean }) {
    const { t } = useTranslation();
    return (
        messages.filter(m => m.role !== 'system').map((m) => (
            <div key={m.id} className={`mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
            {displayTimestamps && m.createdAt ? (<span><TimerIcon className="w-4 h-4"/>{new Date(m.createdAt).toLocaleString()}</span>) : null}
              <span
                className={`inline-block p-2 rounded-lg ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {m.toolInvocations && displayToolResultsMode !== DisplayToolResultsMode.None ? (
                  <div className="mb-2">
                    {m.toolInvocations.filter(tl=>tl.state === 'result').map((tl) => (
                      <div key={tl.toolCallId} className="mb-2">
                        <span className="font-bold">{t('Tool response: ')}</span>
                        <span className="ml-2">{tl.result ? (typeof tl.result === 'string' ? (<Markdown className={styles.markdown} remarkPlugins={[remarkGfm]}>{t(tl.result)}</Markdown>) : (<JsonView value={tl.result} />)) : t('N/A') }</span>
                      </div>
                    ))}
                  </div>
                ) :  (null)
                }
                {
                  (m.content && typeof m.content === 'string' ? <Markdown className={styles.markdown} remarkPlugins={[remarkGfm]}>{m.content}</Markdown> : (
                      (m.content as unknown as Array<{ type: string, result?: string, text?: string }>).map((c) => {
                        if (c.type === 'text' && c.text) return (<Markdown className={styles.markdown} remarkPlugins={[remarkGfm]}>{c.text}</Markdown>)
                        if (c.type === 'tool-result' && c.result) return (typeof c.result === 'string' ? (<Markdown className={styles.markdown} remarkPlugins={[remarkGfm]}>{t(c.result)}</Markdown>) : (<JsonView value={c.result} />));
                      })
                    )
                )}
              </span>
            </div>
        )))
    }