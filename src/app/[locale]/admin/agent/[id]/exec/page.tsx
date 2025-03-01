'use client'
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { onAgentSubmit } from '../general/page';
import { AgentStatus } from '@/components/layout/agent-status';
import React, { useEffect, useState } from 'react';
import { EditorStep } from '@/flows/models';
import { AgentFlow } from '@/data/client/models';
import { safeJsonParse } from '@/lib/utils';
import { FlowsExecForm } from '@/components/flows/flows-exec-form';

export default function ExecPage() {

  const { t } = useTranslation();
  const router = useRouter();
  const { current: agent, dirtyAgent, status, updateAgent } = useAgentContext();

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

  const onFlowChanged = (value: EditorStep) => {
    if (rootFlow) {
      setRootFlow(value);
    }
  }

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
      <div>

      </div>

      { isDirty ? (
        <AgentStatus status={{ id: 'dirty', message: t('You have unsaved changes'), type: 'warning' }} />
      ) : (
      <AgentStatus status={status} />
      ) }

        <div>
          {rootFlow && currentFlow && agent && (
            <FlowsExecForm agentFlow={currentFlow} agent={agent} agents={agents ?? []} inputs={inputs ?? []} rootFlow={rootFlow}  />
          )}

        </div>

    </div>
  );
}