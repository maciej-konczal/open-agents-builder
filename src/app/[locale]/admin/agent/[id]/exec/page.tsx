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
import SyntaxHighlighter from 'react-syntax-highlighter';
import { set } from 'date-fns';

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
  const defaultFlow = watch('defaultFlow') ?? '';

  const [newFlowName, setNewFlowName] = useState<string>('');
  const [addFlowError, setAddFlowError] = useState<string>('');
  const [newFlowCode, setNewFlowCode] = useState<string>('');

  const inputs = watch('inputs') ?? [];
  const agents = watch('agents') ?? [];
  const flows = watch('flows') ?? [] as AgentFlow[];
  const [rootFlow, setRootFlow] = useState<EditorStep | undefined>(undefined);
  const [currentFlow, setCurrentFlow] = useState<AgentFlow | undefined>(undefined);
  const [shareLink, setShareLink] = useState<string>('');

  const [execMode, setExecMode] = useState<string>('sync');
  const [outputMode, setOutputMode] = useState<string>('stream');

  const [apiCallVars, setApiCallVars] = useState<Record<string, string> | string>();

  const [snippet1, setSnippiet1] = useState<string>('');

  const onFlowChanged = (value: EditorStep) => {
    if (rootFlow) {
      setRootFlow(value);
    }
  }

  useEffect(() => {
    if (currentFlow) {
      setShareLink(`${process.env.NEXT_PUBLIC_APP_URL}/exec/${dbContext?.databaseIdHash}/${agentContext.current?.id}?flow=${currentFlow.code}`);

      const inputObj = {
        input: apiCallVars,
        flow: currentFlow.code,
        execMode,
        outputMode
      }
      setSnippiet1(`
curl -X POST \
${!agent?.published ? `-H "Authorization: Bearer \${OPEN_AGENT_BUILDER_API_KEY}"` : ``} \
-H "database-id-hash: ${dbContext?.databaseIdHash ?? ''}" \
-H "Content-Type: application/json" \
-d '${typeof apiCallVars === "string" ? inputObj : JSON.stringify(inputObj)}' \
${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/agent/${agent?.id}/exec
`);


    }
  }, [currentFlow, apiCallVars, execMode, outputMode]);

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


        {flows?.length > 0 && (
          <select className="form-select text-sm w-full mb-2 p-2 rounded border" value={currentFlow?.code ?? defaultFlow} onChange={(e) => {
            const flow = flows.find(f => f.code === e.target.value);
            if (flow) {
              setRootFlow(flow.flow);
              setCurrentFlow(flow);
            }
          }}>
            {flows.map((flow, index) => (
              <option key={index} value={flow.code}>{flow.name}</option>
            ))}
          </select>
        )}


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
            {agent && (
              <AccordionItem value="run"  className="rounded-lg border pl-2 pr-2 mb-2">
                <AccordionTrigger><div className="flex"><PlayIcon className="mr-2"/>{t('Run the flow')} {currentFlow && t(`[${currentFlow?.name}]`)}</div></AccordionTrigger>
                <AccordionContent>
                  <ExecProvider>
                    <FlowsExecForm initializeExecContext={true} onVariablesChanged={(vars) => {
                        setApiCallVars(vars); 
                    }} agent={agent} agentFlow={currentFlow} agents={agents} inputs={inputs} flows={flows} displayMode={ExecFormDisplayMode.Admin} databaseIdHash={dbContext?.databaseIdHash} />
                  </ExecProvider>
                </AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="api" className="rounded-lg border pl-2 pr-2 mb-2">
              <AccordionTrigger>
                <div className="flex"><CogIcon className="mr-2"/> {t('Run via API')}</div>
              </AccordionTrigger>
              <AccordionContent className="p-2">
                {!agent?.published && (
                <p className="text-sm mb-2">{t('In order to use the API make sure you have at least one API key ')} <a className="underline text-blue-300" href={"/admin/agent/" + agent?.id + "/api" }>{t('created on the API tab')}</a></p>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('Execution mode')}</label>
                  <select value={execMode} onChange={(e) => setExecMode(e.target.value)} className="form-select text-sm w-full mb-2 p-2 rounded border">
                    <option value="sync">{t('Synchronous')}</option>
                    <option value="async">{t('Asynchronous')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('Output mode')}</label>
                  <select value={outputMode} onChange={(e) => setOutputMode(e.target.value)}  className="form-select text-sm w-full mb-2 p-2 rounded border">
                    <option value="stream">{t('Stream')}</option>
                    <option value="buffer">{t('Buffer')}</option>
                  </select>
                </div>

                <p className="text-sm">{t('You can run this flow via API by sending a POST request to the following endpoint')}:</p>

<SyntaxHighlighter language="bash" wrapLines={true}>
  {snippet1}
</SyntaxHighlighter>
<Button size={"sm"} className="mt-4" variant={"outline"} onClick={() => {
  copy(snippet1)
}}><CopyIcon className="w-4 h-4 mr-2" />{t('Copy snippet')}</Button>


<p className="text-sm mt-2">{t('For more details, please go to ')} <a className="underline text-blue-300" href="https://docs.openagentsbuilder.com/api/20-executing-flow/">{t('API Documentation page')}</a></p>
              </AccordionContent>
            </AccordionItem>            
          </Accordion>
    </div>
  );
}