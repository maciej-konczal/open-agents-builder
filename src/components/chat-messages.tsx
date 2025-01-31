import { Message } from "ai";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from './chat.module.css';
import { useTranslation } from "react-i18next";

export function ChatMessages({ messages }: { messages: Message[] }) {
    const { t } = useTranslation();
    return (
        messages.filter(m => m.role !=='tool' && m.role !== 'system').map((m) => (
            <div key={m.id} className={`mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
              <span
                className={`inline-block p-2 rounded-lg ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {m.toolInvocations ? (
                  <div className="mb-2">
                    {m.toolInvocations.map((tl) => (
                      <div key={tl.id} className="mb-2">
                        <span className="font-bold">{t('Tool response: ')}</span>
                        <span className="ml-2">{tl.result}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Markdown className={styles.markdown} remarkPlugins={[remarkGfm]}>{typeof m.content === 'string' ? m.content : Array.from(m.content).map((c) => c.text ? c.text : '' ).join(' ')}</Markdown>
                )}
              </span>
            </div>
        )))
    }