import { Message } from "ai";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TimerIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChatMessageMarkdown } from "./chat-message-markdown"; // or your own Markdown renderer
import styles from "./chat.module.css";

export function DebugChatMessages({
  messages,
  displayTimestamps = false,
}: {
  messages: Message[];
  displayTimestamps: boolean;
}) {
  const { t } = useTranslation();

  return (
    <>
      {messages
        // Filter out system messages or empty content
        .filter(
          (m) =>
            m.role !== "system" &&
            (typeof m.content === "string" ||
              (Array.isArray(m.content) &&
                m.content.some(
                  (c) => c.type !== "tool-call" && (c.text || c.result)
                )))
        )
        .map((m) => {
          // Format JSON strings that are between backticks
          const formatJsonInBackticks = (content: string) => {
            return content.replace(/`(.*?)`/g, (match, p1) => {
              try {
                const parsed = JSON.parse(p1);
                return '`' + JSON.stringify(parsed, null, 2) + '`';
              } catch (e) {
                return match;
              }
            });
          };

          if (typeof m.content === 'string') {
            m.content = formatJsonInBackticks(m.content);
          } else if (Array.isArray(m.content)) {
            m.content = m.content.map(block => {
              if (block.type === 'text' && block.text) {
                block.text = formatJsonInBackticks(block.text);
              }
              return block;
            });
          }
          // Single string content
          if (typeof m.content === "string") {
            return (
              <div key={m.id} className="mb-4">
                {displayTimestamps && m.createdAt && (
                  <div className="flex items-center space-x-1 mb-1 text-xs text-gray-500">
                    <TimerIcon className="w-3 h-3" />
                    <span>{new Date(m.createdAt).toLocaleString()}</span>
                  </div>
                )}
                <div className="border p-2 text-xs rounded-md">
                  <ChatMessageMarkdown>{m.content}</ChatMessageMarkdown>
                </div>
              </div>
            );
          }

          // Array of content blocks
          if (Array.isArray(m.content)) {
            return (
              <div key={m.id} className="mb-4">
                {displayTimestamps && m.createdAt && (
                  <div className="flex items-center space-x-1 mb-1 text-xs text-gray-500">
                    <TimerIcon className="w-3 h-3" />
                    <span>{new Date(m.createdAt).toLocaleString()}</span>
                  </div>
                )}
                {m.content.map((block, idx) => {
                  if (block.type === "text" && block.text) {
                    return (
                      <div
                        key={idx}
                        className="border p-2 text-xs mb-2 last:mb-0 rounded-md"
                      >
                        <ChatMessageMarkdown>{block.text}</ChatMessageMarkdown>
                      </div>
                    );
                  }
                  // If there are other block types, handle or skip them
                  return null;
                })}
              </div>
            );
          }

          return null;
        })}
    </>
  );
}
