'use client'
import { useAgentContext } from '@/contexts/agent-context';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Result, Session } from '@/data/client/models';
import { RenderResult } from '@/components/render-result';
import { Tabs } from '@/components/ui/tabs';
import { TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { ChatMessages, DisplayToolResultsMode } from '@/components/chat-messages';
import ResultDetails from '@/components/result-details';
import { Button } from '@/components/ui/button';
import { CopyIcon, MessageCircleIcon, MoveLeftIcon, SaveIcon, WandSparkles } from 'lucide-react';
import { useCopyToClipboard } from 'react-use';
import { DatabaseContext } from '@/contexts/db-context';
import { useChat } from 'ai/react';
import { nanoid } from 'nanoid';
import { Chat } from '@/components/chat';
import { Credenza, CredenzaTrigger, CredenzaContent } from '@/components/credenza';
import { RenderSession } from '@/components/render-session';


export default function SingleResultPage() {

  const dbContext = useContext(DatabaseContext);
  const [, copy] = useCopyToClipboard();
  const agentContext = useAgentContext();
  const params = useParams();

  const { t, i18n  } = useTranslation();

  const [session, setSession] = useState<Session>();

  useEffect(() => {
    if (agentContext.current?.id)
      agentContext.singleSession(params.sessionId as string).catch((e) => {
        toast.error(getErrorMessage(e));
      }).then((session) => {
        if (session) { 
          setSession(session);
          console.log(session.messages)
        }
      });
  }, [agentContext.current]);



  return (
    <div className="space-y-6">
      <Button size="sm" variant="outline" onClick={() => history.back()}><MoveLeftIcon /> {t('Back')}</Button>
      <Card>
        <CardContent className="p-6">
              <RenderSession session={session} />
              <div className="p-4">
                <ChatMessages 
                      displayTimestamps={true}
                      displayToolResultsMode={DisplayToolResultsMode.AsTextMessage}
                      messages={session?.messages ?? []}
                  />
              </div>
        </CardContent>
      </Card>

    </div>
  );
}