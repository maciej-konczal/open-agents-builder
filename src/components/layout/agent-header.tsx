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
import { Plus, Play, Trash2Icon, LayoutTemplateIcon, PlusIcon, SaveIcon, ImportIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import TemplateListPopup from '../template-list-popup';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { TemplateContext } from '@/contexts/template-context';
import { Agent } from '@/data/client/models';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { AgentDeleteDialog } from '../agent-delete-dialog';

export function AgentHeader() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const currentId = params?.id as string;
  const agentContext = useAgentContext();
  const templateContext = useContext(TemplateContext);
  const dbContext = useContext(DatabaseContext);

  useEffect(() => {
    try {
      agentContext.listAgents(currentId);
    } catch (e) {
      console.error(e);
      toast.error(t('Failed to load agents'));
    }
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
        <TemplateListPopup />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="" size="sm">
              <LayoutTemplateIcon className="h-4 w-4" /> {t('Templates')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => templateContext?.setTemplatePopupOpen(true)}><PlusIcon className="mr-2 h-4 w-4"/> {t('New agent from template ...')}</DropdownMenuItem>
            <DropdownMenuItem onClick={async (e) => {
              try {
                  if (agentContext.current) {
                    await templateContext?.updateTemplate(new Agent({ ...agentContext.current, id: nanoid() } as Agent));
                    toast.info(t('Current agent has been saved as a template'))
                  }              
                } catch (e) {
                  console.error(e);
                  toast.error(t('Failed to save agent as a template'));
                }
            }}><SaveIcon className="mr-2 h-4 w-4"/>{t('Save agent as template')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="" size="sm">
              <ImportIcon className="h-4 w-4" /> {t('Export / Import')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {agentContext.current?.id !== 'new' ? (
              <DropdownMenuItem onSelect={async () => {
                try {
                  if (agentContext.current) {
                    agentContext.exportAgent(agentContext.current);
                    toast.info(t('Current agent has been exported'))
                  }              
                } catch (e) {
                  console.error(e);
                  toast.error(t('Failed to export agent'));
                }
              }}><PlusIcon className="mr-2 h-4 w-4"/> {t('Export agent to JSON ...')}</DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={() => {
            }}><SaveIcon className="mr-2 h-4 w-4"/>{t('Import agent from JSON ...')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>        
        <AgentDeleteDialog />
          {agentContext.current?.id !== 'new' ? (
          <Button variant={"secondary"} size="sm" onClick={(e) => agentContext.setAgentDeleteDialogOpen(true)}>
            <Trash2Icon className="mr-2 h-4 w-4"  />
            {t('Delete agent')}
          </Button>        
          ) : null}

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