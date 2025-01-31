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
import { useChat } from 'ai/react';
import { nanoid } from 'nanoid';
import { DatabaseContext } from '@/contexts/db-context';
import { FolderOpen, FolderOpenIcon, Loader2, MessageCircleIcon } from 'lucide-react';
import InfiniteScroll from '@/components/infinite-scroll';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { Chat } from '@/components/chat';
import { NoRecordsAlert } from '@/components/shared/no-records-alert';
import Link from 'next/link';


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
      }).catch((e) => {
        console.error(e)
        toast.error(getErrorMessage(e))
      })
    }
  }, [agentContext.current, isResultsChatOpen]);

  useEffect(() => {
    if (agentContext.current?.id)
      agentContext.agentResults(agentContext.current.id, resultsQuery).catch((e) => {
        toast.error(getErrorMessage(e));
      });
  }, [agentContext.current]);

  useEffect(() => {
    setHasMore(agentContext.results.total > agentContext.results.offset);
    setResultsLoading(false);
  }, [agentContext.results]);

  return (
    <div className="space-y-6">


      { agentContext.results.rows.length > 0 ? (
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
      ): null}
      {agentContext.results.rows.length === 0 ? (
        <NoRecordsAlert title={t('No results yet!')}>
          {t('No results saved for this agent yet! Please send the agent link to get the results flow started!')}
        </NoRecordsAlert>
      ): null}
      {agentContext.results.rows.map((result) => (
        <Card key={result.sessionId}>
          <CardHeader>
            <CardTitle>
            <Button className="ml-auto right-20 mr-2" size={"sm"} variant="outline">
              <FolderOpenIcon className="w-4 h-4" />
              {t('Open details ...')}
            </Button>

              <Link href={`/agent/${result.agentId}/results/${result.sessionId}`}>{new Date(result.createdAt).toLocaleString()} {result.userName ? result.userName : ''} {result.userEmail ? result.userEmail : ''}</Link></CardTitle>
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