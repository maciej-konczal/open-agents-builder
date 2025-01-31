'use client'
import { useAgentContext } from '@/contexts/agent-context';
import { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DatabaseContext } from '@/contexts/db-context';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';


export default function SingleResultPage() {
  const agentContext = useAgentContext();
  const params = useParams();

  const dbContext = useContext(DatabaseContext);
  const { t, i18n  } = useTranslation();


  useEffect(() => {
    if (agentContext.current?.id)
      agentContext.singleResult(params.sessionId as string).catch((e) => {
        toast.error(getErrorMessage(e));
      });
  }, [agentContext.current]);


  return (
    <div className="space-y-6">

    </div>
  );
}