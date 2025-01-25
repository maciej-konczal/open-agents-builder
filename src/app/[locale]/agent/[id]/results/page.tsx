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
import { Loader2, MessageCircleIcon } from 'lucide-react';
import InfiniteScroll from '@/components/infinite-scroll';


export default function ResultsPage() {
  const agentContext = useAgentContext();
  const dbContext = useContext(DatabaseContext);
  const { t, i18n  } = useTranslation();

  const [hasMore, setHasMore] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsQuery, setResultsQuery] = useState({
    limit: 4,
    offset: 0,
    orderBy: 'createdAt',
    query: ''
  });
  const [pageSize, setPageSize] = useState(4);

  const { messages, handleInputChange, isLoading, append, handleSubmit, input} = useChat({
    api: "/api/agent/results-chat",
  });
  const [isResultsChatOpen, setResultsChatOpen] = useState(false);
  
  const getSessionHeaders = () => {
    return {
      'Database-Id-Hash': dbContext?.databaseIdHash ?? '',
      'Agent-Id': agentContext.current?.id ?? '',
      'Agent-Locale': i18n.language
    }
  }
  useEffect(() => {
    if (agentContext.current && isResultsChatOpen){
      append({
        id: nanoid(),
        role: "user",
        content: t("Lets chat")
      }, {
        headers: getSessionHeaders()
      })
    }
  }, [agentContext.current, isResultsChatOpen]);

  useEffect(() => {
    if (agentContext.current?.id)
      agentContext.agentResults(agentContext.current.id, resultsQuery);
  }, [agentContext.current]);

  useEffect(() => {
    setHasMore(agentContext.results.total > agentContext.results.offset);
    setResultsLoading(false);
  }, [agentContext.results]);

  return (
    <div className="space-y-6">


      <Credenza open={isResultsChatOpen} onOpenChange={setResultsChatOpen}>
        <CredenzaTrigger asChild>
          <Button onClick={() => setResultsChatOpen(true)}><MessageCircleIcon /> Chat about results ...</Button>
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
      {agentContext.results.rows.map((result) => (
        <Card key={result.sessionId}>
          <CardHeader>
            <CardTitle>{new Date(result.createdAt).toLocaleString()} {result.userName ? result.userName : ''} {result.userEmail ? result.userEmail : ''}</CardTitle>
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
       <InfiniteScroll hasMore={hasMore} isLoading={resultsLoading} next={() => {
        if ((resultsQuery.offset + resultsQuery.limit) < agentContext.results.total) {
          const expandedQr = { ...resultsQuery, limit: resultsQuery.limit + pageSize };
          setResultsQuery(expandedQr);
          
          if (agentContext.current?.id)
            agentContext.agentResults(agentContext.current.id, expandedQr);
          
          setResultsLoading(true);
          setHasMore(true);
        } else {
          setHasMore(false);
        }
          
       }} threshold={1}>
          {hasMore && <Loader2 className="my-4 h-8 w-8 animate-spin" />}
        </InfiniteScroll>      
    </div>
  );
}