'use client'
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { onAgentSubmit } from '../general/page';
import { AgentStatus } from '@/components/layout/agent-status';
import React, { use, useContext, useEffect, useState } from 'react';
import { EditorStep } from '@/flows/models';
import { AgentFlow } from '@/data/client/models';
import { safeJsonParse } from '@/lib/utils';
import { ExecFormDisplayMode, FlowsExecForm } from '@/components/flows/flows-exec-form';
import { ExecProvider } from '@/contexts/exec-context';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CogIcon, CopyIcon, PlayIcon, ShareIcon } from 'lucide-react';
import { FlowAgentsEditor } from '@/components/flows/flows-agent-editor';
import { Input } from '@/components/ui/input';
import { DatabaseContext } from '@/contexts/db-context';
import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from 'react-use';
import { toast } from 'sonner';

export default function ExecPage() {

  const dbContext = useContext(DatabaseContext);
  const agentContext = useAgentContext();
  const { t } = useTranslation();
  const router = useRouter();
  const [, copy] = useCopyToClipboard();
  const { current: agent, dirtyAgent, status, updateAgent } = useAgentContext();
  const [currentTabs, setCurrentTabs] = useState<string[]>(['run', 'share']);

  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm({
    defaultValues: agent ? agent.toForm(null) : {},
  });  

  register('flows')

  const [newFlowName, setNewFlowName] = useState<string>('');
  const [addFlowError, setAddFlowError] = useState<string>('');
  const [newFlowCode, setNewFlowCode] = useState<string>('');

  const inputs = watch('inputs') ?? [];
  const agents = watch('agents') ?? [];
  const flows = watch('flows') ?? [] as AgentFlow[];
  const [rootFlow, setRootFlow] = useState<EditorStep | undefined>(undefined);
  const [currentFlow, setCurrentFlow] = useState<AgentFlow | undefined>(undefined);
  const [shareLink, setShareLink] = useState<string>('');

  const onFlowChanged = (value: EditorStep) => {
    if (rootFlow) {
      setRootFlow(value);
    }
  }

  useEffect(() => {
    if (currentFlow) {
      setShareLink(`${process.env.NEXT_PUBLIC_APP_URL}/exec/${dbContext?.databaseIdHash}/${agentContext.current?.id}`);
    }
  }, [currentFlow]);

  useEffect(() => { 
    if (rootFlow && currentFlow) {
      setValue('flows', flows.map(f => f.code === currentFlow.code ? { ...f, flow: rootFlow } : f));
    }

  }, [rootFlow, currentFlow]);

  useEffect(() => {
    const savedFlow = safeJsonParse(sessionStorage.getItem('currentFlow') ?? '', {});
    
    if (flows && flows.length > 0 && !rootFlow && !currentFlow) {
      if (savedFlow) {
        const flow = flows.find(f => f.code === savedFlow.code);
        if (flow) {
          setRootFlow(flow.flow);
          setCurrentFlow(flow);
        } else {
          setRootFlow(flows[0].flow);
          setCurrentFlow(flows[0]);
        }
      } else {
        setRootFlow(flows[0].flow);
        setCurrentFlow(flows[0]);
      }
    }
  }, [flows, rootFlow, currentFlow]);

  useEffect(() => {
    sessionStorage.setItem('currentFlow', JSON.stringify(currentFlow));
  }, [currentFlow]);
  

  useEffect(() => {
    setAddFlowError('');
    if (newFlowCode){ 
      if (flows && flows.find(f => f.code === newFlowCode)) {
        setAddFlowError(t('Flow with this code already exists'));
      } 
    } else {
      setAddFlowError(t('Flow code is required'));
    }

    if (!newFlowName) {
      setAddFlowError(t('Flow name is required'));
    }
  }, [newFlowCode, newFlowName]);

  const { onSubmit, isDirty } = onAgentSubmit(agent, watch, setValue, getValues, updateAgent, t, router, {});

  return (
    <div className="space-y-6">
      { isDirty ? (
        <AgentStatus status={{ id: 'dirty', message: t('You have unsaved changes'), type: 'warning' }} />
      ) : (
      <AgentStatus status={status} />
      ) }

          <Accordion type="multiple" className="w-full" value={currentTabs} onValueChange={(value) => setCurrentTabs(value)}>
            <AccordionItem value="share"  className="rounded-lg border pl-2 pr-2 mb-2">
              <AccordionTrigger><div className="flex"><ShareIcon className="mr-2"/>{t('Share the flow link')}</div></AccordionTrigger>
              <AccordionContent>
                <p className="text-sm">{t('To let the users use this flow please simply copy and share the following link')}:</p>
                <div className="flex pt-2">
                  <Input type="text" value={shareLink} readOnly className="w-full"/>
                  <Button variant="ghost"  onClick={() => {
                    copy(shareLink)
                    toast.info(t('Link has been copied to clipboard'));
                  } 
                }>
                    <CopyIcon className="w-4 h-4 mt-2 cursor-pointer"/>
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="run"  className="rounded-lg border pl-2 pr-2 mb-2">
              <AccordionTrigger><div className="flex"><PlayIcon className="mr-2"/>{t('Run the flow')}</div></AccordionTrigger>
              <AccordionContent>
                <ExecProvider>
                  <FlowsExecForm agent={agent} agentFlow={currentFlow} agents={agents} inputs={inputs} flows={flows} displayMode={ExecFormDisplayMode.Admin} />
                </ExecProvider>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="api" className="rounded-lg border pl-2 pr-2 mb-2">
              <AccordionTrigger>
                <div className="flex"><CogIcon className="mr-2"/> {t('Run via API')}</div>
              </AccordionTrigger>
              <AccordionContent>
              </AccordionContent>
            </AccordionItem>            
          </Accordion>
    </div>
  );
}