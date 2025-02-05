'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgentContext } from '@/contexts/agent-context';
import { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DatabaseContext } from '@/contexts/db-context';
import {  FolderOpenIcon, Loader2 } from 'lucide-react';
import InfiniteScroll from '@/components/infinite-scroll';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { NoRecordsAlert } from '@/components/shared/no-records-alert';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RenderSession } from '@/components/render-session';


export default function SessionsPage() {
  const agentContext = useAgentContext();
  const dbContext = useContext(DatabaseContext);
  const { t, i18n  } = useTranslation();
  const router = useRouter();

  const [hasMore, setHasMore] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsQuery, setSessionsQuery] = useState({
    limit: 4,
    offset: 0,
    orderBy: 'createdAt',
    query: ''
  });
  const [pageSize, setPageSize] = useState(4);
  
  const getSessionHeaders = () => {
    return {
      'Database-Id-Hash': dbContext?.databaseIdHash ?? '',
      'Agent-Id': agentContext.current?.id ?? '',
      'Agent-Locale': i18n.language
    }
  }

  useEffect(() => {
    if (agentContext.current?.id)
      agentContext.agentSessions(agentContext.current.id, sessionsQuery).catch((e) => {
        toast.error(getErrorMessage(e));
      });
  }, [agentContext.current]);

  useEffect(() => {
    setHasMore(agentContext.sessions.total > agentContext.sessions.offset);
    setSessionsLoading(false);
  }, [agentContext.results]);

  return (
    <div className="space-y-6">
      {agentContext.sessions.rows.length === 0 ? (
        <NoRecordsAlert title={t('No sessions yet!')}>
          {t('No sessions started for this agent yet! Please send the agent link to get the sessions flow started!')}
        </NoRecordsAlert>
      ): null}
      {agentContext.sessions.rows.map((session) => (
        <Card key={session.id}>
          <CardHeader>
            <CardTitle>
            <Button className="ml-auto right-20 mr-2" size={"sm"} variant="secondary" onClick={() => {
              router.push(`/agent/${session.agentId}/sessions/${session.id}`);
            }}>
              <FolderOpenIcon className="w-4 h-4" />
              {t('Open details ...')}
            </Button>

              <Link href={`/agent/${session.agentId}/sessions/${session.id}`}>{new Date(session.createdAt).toLocaleString()} {session.userName ? session.userName : ''} {session.userEmail ? session.userEmail : ''}</Link></CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <RenderSession session={session} />
          </CardContent>
        </Card>
      ))}
       <InfiniteScroll hasMore={hasMore} isLoading={sessionsLoading} next={() => {
        if ((sessionsQuery.offset + sessionsQuery.limit) < agentContext.results.total) {
          const expandedQr = { ...sessionsQuery, limit: sessionsQuery.limit + pageSize };
          setSessionsQuery(expandedQr);
          
          if (agentContext.current?.id)
            agentContext.agentResults(agentContext.current.id, expandedQr);
          
          setSessionsLoading(true);
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