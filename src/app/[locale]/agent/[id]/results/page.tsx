'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgentContext } from '@/contexts/agent-context';
import { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '@/components/chat.module.css';
import JsonView from '@uiw/react-json-view';
import { useState } from 'react';
import { Credenza, CredenzaContent, CredenzaTrigger } from '@/components/credenza';
import { Button } from '@/components/ui/button';
import { Chat } from '@/components/chat';
import { useChat } from 'ai/react';
import { nanoid } from 'nanoid';
import { DatabaseContext } from '@/contexts/db-context';
import { get } from 'http';
import { MessageCircleIcon } from 'lucide-react';


export default function ResultsPage() {
  const agentContext = useAgentContext();
  const dbContext = useContext(DatabaseContext);
  const { t, i18n  } = useTranslation();

  const { messages, handleInputChange, isLoading, append, handleSubmit, input} = useChat({
    api: "/api/agent/results-chat",
  });
  const [isCredenzaOpen, setIsCredenzaOpen] = useState(false);
  
  const getSessionHeaders = () => {
    return {
      'Database-Id-Hash': dbContext?.databaseIdHash ?? '',
      'Agent-Id': agentContext.current?.id ?? '',
      'Agent-Locale': i18n.language
    }
  }
  useEffect(() => {
    if (agentContext.current){
      append({
        id: nanoid(),
        role: "user",
        content: t("Lets chat")
      }, {
        headers: getSessionHeaders()
      })
    }
  }, [agentContext.current]);

  useEffect(() => {
    if (agentContext.current?.id)
      agentContext.agentResults(agentContext.current.id);
  }, [agentContext.current]);

  return (
    <div className="space-y-6">


      <Credenza open={isCredenzaOpen} onOpenChange={setIsCredenzaOpen}>
        <CredenzaTrigger asChild>
          <Button onClick={() => setIsCredenzaOpen(true)}><MessageCircleIcon /> Chat about results ...</Button>
        </CredenzaTrigger>
        <CredenzaContent>
          {/* Add your chat component or content here */}
          <Chat
            headers={getSessionHeaders()}
            welcomeMessage={t('Lets chat')}
            messages={messages}
            handleInputChange={handleInputChange}
            isLoading={isLoading}
            handleSubmit={handleSubmit}
            input={input}
            displayName={t('Chat with results')}
          />
        </CredenzaContent>
      </Credenza>
      {agentContext.results.map((result) => (
        <Card key={result.sessionId}>
          <CardHeader>
            <CardTitle>{new Date(result.createdAt).toLocaleString()}{result.userName ? result.userName : ''}{result.userEmail ? result.userEmail : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            {result.format === 'JSON' ? (
              <JsonView value={JSON.parse(result.content ?? '{}')} />
            ) : null}
            {result.format === 'markdown' ? (
                  <Markdown className={styles.markdown} remarkPlugins={[remarkGfm]}>{result.content}</Markdown>
                ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}