'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAgentContext } from '@/contexts/agent-context';
import { DatabaseContext } from "@/contexts/db-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@radix-ui/react-alert-dialog';
import { Plus, Play, DeleteIcon, Delete, MinusIcon, Trash2Icon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { use, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertDialogHeader, AlertDialogFooter } from '../ui/alert-dialog';

export function AgentHeader() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const currentId = params?.id as string;
  const agentContext = useAgentContext();
  const dbContext = useContext(DatabaseContext);

  useEffect(() => {
    agentContext.listAgents(currentId);
  }, [currentId]);

  const handleAgentChange = (newId: string) => {
    localStorage.setItem('currentAgentId', newId);
    router.push(`/agent/${newId}/general`);
  };

  return (
    <div className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <Select value={currentId} onValueChange={handleAgentChange}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder={t('Select project')} />
          </SelectTrigger>
          <SelectContent>
            {agentContext.agents.map((project) => (
              <SelectItem key={project.id} value={project.id ?? ''}>
                {project.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => router.push('/agent/new/general')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('Add Agent')}
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger>
            {agentContext.current?.id !== 'new' ? (
            <Button variant={"secondary"} size="sm">
              <Trash2Icon className="mr-2 h-4 w-4"  />
              {t('Delete agent')}
            </Button>        
            ) : null}
          </AlertDialogTrigger>
          <AlertDialogContent className="w-[400px] bg-background text-sm p-4 rounded-lg shadow-lg border border-gray-200">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your agent data
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No</AlertDialogCancel>
              <AlertDialogAction className='' onClick={async (e) => 
                {
                  if(agentContext.current?.id  && agentContext.current?.id !== 'new') {
                    const resp = await agentContext.deleteAgent(agentContext.current)
                    localStorage.removeItem('currentAgentId');
                    router.push(`/agent/new/general`);
                  }

                }
              }>YES</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>       

      </div>
      {(agentContext.current?.id !== 'new') ? (
        <Button variant="secondary" size="sm" onClick={() => window.open(`/chat/${dbContext?.databaseIdHash}/${agentContext.current?.id}`)}>
            <Play className="mr-2 h-4 w-4" />
          {t('Preview')}
        </Button>
      ) : null}

    </div>
  );
}