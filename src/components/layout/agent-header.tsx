'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectSeparator,
  SelectValue,
} from '@/components/ui/select';
import { useAgentContext } from '@/contexts/agent-context';
import { DatabaseContext } from "@/contexts/db-context";
import { Play, Trash2Icon, LayoutTemplateIcon, ImportIcon, ShareIcon, Share2Icon, FilePlusIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { use, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TemplateListPopup from '../template-list-popup';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { TemplateContext } from '@/contexts/template-context';
import { toast } from 'sonner';
import { AgentDeleteDialog } from '../agent-delete-dialog';
import { useFilePicker } from 'use-file-picker';
import { getErrorMessage } from '@/lib/utils';
import { useCopyToClipboard } from 'react-use';
import { Agent } from '@/data/client/models';

export function AgentHeader() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const currentId = params?.id as string;
  const agentContext = useAgentContext();
  const templateContext = useContext(TemplateContext);
  const dbContext = useContext(DatabaseContext);
  const [, copy] = useCopyToClipboard();

  const [templatesDropdownOpen, setTemplatesDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);


  const { openFilePicker, filesContent, loading } = useFilePicker({
    accept: '.json',
    readAs: 'Text',
    onFilesSuccessfullySelected: async () => {
      filesContent.map(async (fileContent) => {
        try {
          const updatedAgent = await agentContext?.importAgent(fileContent.content);
          toast.info(t('Agent imported successfully!'));
          router.push(`/admin/agent/${updatedAgent.id}/general`);
        } catch (e) {
          console.error(e);
          toast.error(t('Failed to import agent. Check the file format.'));
        }
      });
    }
  });
// eslint-disable-next-line
  useEffect(() => {
    agentContext.listAgents(currentId).catch((e)=> {
      console.error(e);
      toast.error(t(getErrorMessage(e)))
    });
  }, [currentId]);


  useEffect(() => {
    if (agentContext.current?.id !== 'new') {
      const agent = agentContext.dirtyAgent ?? agentContext.current ?? null;

      if (agent) {
        if (agent.agentType === 'flow') { // TODO: add support for other interface types here
          setPreviewUrl(`${process.env.NEXT_PUBLIC_APP_URL}/exec/${dbContext?.databaseIdHash}/${agentContext.current?.id}`);
        } else { 
          setPreviewUrl(`${process.env.NEXT_PUBLIC_APP_URL}/chat/${dbContext?.databaseIdHash}/${agentContext.current?.id}`);
        }
      }
    }
  }, [agentContext.current, agentContext.dirtyAgent]);

  const handleAgentChange = (newId: string) => {

    if (newId === 'new-from-template') {
      templateContext?.setOnboardingOpen(true);
      templateContext?.setOnboardingWellcomeHeader(false); 
      return;
    }

    localStorage.setItem('currentAgentId', newId);
    router.push(`/admin/agent/${newId}/general`);
  };

  return (
    <div className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <Select value={currentId} onValueChange={handleAgentChange}>
          <SelectTrigger className="w-[230px]">
            <SelectValue placeholder={t('Select project')} />
          </SelectTrigger>
          <SelectContent>
            {agentContext.agents.filter(a=>a.id !== 'new').map((project) => (
              <SelectItem key={project.id} value={project.id ?? ''}>
                {project.displayName}
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value="new" className="flex">
              {t('New agent ...')}
            </SelectItem>
            <SelectItem value="new-from-template" className="flex">
              {t('New agent from template ...')}
            </SelectItem>
          </SelectContent>
        </Select>

        <TemplateListPopup />
        <DropdownMenu open={templatesDropdownOpen} onOpenChange={setTemplatesDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="lg:flex" onClick={() => router.push('/admin/agent/new/general')} onMouseOver={() => setTemplatesDropdownOpen(true)} >
              <FilePlusIcon className="mr-2 h-4 w-4" />
              <span className="md:hidden lg:flex">{t('New Agent...')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-xs" onSelect={async () => {
              router.push('/admin/agent/new/general'); }} onMouseOver={() => setTemplatesDropdownOpen(true)}
            ><FilePlusIcon className="mr-2 h-4 w-4" /> {t('New agent ...')}</DropdownMenuItem>

            <DropdownMenuItem className="text-xs" onSelect={() => {
              templateContext?.setOnboardingOpen(true);
              templateContext?.setOnboardingWellcomeHeader(false); 
            }}><LayoutTemplateIcon className="mr-2 h-4 w-4"/> {t('New agent from template ...')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
       
        <DropdownMenu open={exportDropdownOpen} onOpenChange={setExportDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="" size="sm" onMouseOver={() => setExportDropdownOpen(true)}>
              <ShareIcon className="h-4 w-4" /> <span className="md:hidden lg:flex">{t('Export / Import agent')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {agentContext.current?.id !== 'new' ? (
              <DropdownMenuItem  className="text-xs"  onSelect={async () => {
                try {
                  if (agentContext.current) {
                    agentContext.exportAgent(agentContext.current);
                    toast.info(t('Current agent has been exported'))
                  }              
                } catch (e) {
                  console.error(e);
                  toast.error(t('Failed to export agent'));
                }
              }}><ShareIcon className="mr-2 h-4 w-4"/> {t('Export agent to JSON ...')}</DropdownMenuItem>
            ) : null}
            <DropdownMenuItem  className="text-xs"  onSelect={() => {
              openFilePicker();
            }}><ImportIcon className="mr-2 h-4 w-4"/>{t('Import agent from JSON ...')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>  
        <AgentDeleteDialog />
          {agentContext.current?.id !== 'new' ? (
          <Button variant={"secondary"} size="sm" onClick={(e) => agentContext.setAgentDeleteDialogOpen(true)}>
            <Trash2Icon className="mr-2 h-4 w-4"  />
            <span className="md:hidden lg:flex">{t('Delete agent')}</span>
          </Button>        
          ) : null}

      </div>

      <div>
        {(agentContext.current?.id !== 'new' && previewUrl) ? (
          <Button variant="secondary" className="mr-2" size="sm" onClick={() => window.open(previewUrl)}>
              <Play className="mr-2 h-4 w-4" />
            {t('Preview')}
          </Button>
        ) : null}
        {(agentContext.current?.id !== 'new') ? (
          <Button title={t('Share link to agent with users')} variant="secondary" size="sm" onClick={() => { copy(process.env.NEXT_PUBLIC_APP_URL + `/chat/${dbContext?.databaseIdHash}/${agentContext.current?.id}`); toast.info(t('Link has been copied to clipboard. Now you can share it with the users')) }}>
              <Share2Icon className="mr-2 h-4 w-4" />
          </Button>
        ) : null}     
      </div>
    </div>
  );
}