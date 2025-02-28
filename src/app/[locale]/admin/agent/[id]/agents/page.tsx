'use client'
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { onAgentSubmit } from '../general/page';
import { AgentStatus } from '@/components/layout/agent-status';
import React from 'react';
import { FlowAgentsEditor } from '@/components/flows/flows-agent-editor';
import { AgentDefinition } from '@/flows/models';

export default function AgentsPage() {

  const { t } = useTranslation();
  const router = useRouter();
  const { current: agent, dirtyAgent, status, updateAgent } = useAgentContext();

  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm({
    defaultValues: agent ? agent.toForm(null) : {},
  });  

  const agents = watch('agents') ?? [];
  
  const onAgentsChanged = (value: AgentDefinition[]) => {
    setValue('agents', value);
  }
  
  const { onSubmit, isDirty } = onAgentSubmit(agent, watch, setValue, getValues, updateAgent, t, router, {});

  return (
    <div className="space-y-6">
      { isDirty ? (
        <AgentStatus status={{ id: 'dirty', message: t('You have unsaved changes'), type: 'warning' }} />
      ) : (
      <AgentStatus status={status} />
      ) }

        <div>
            <FlowAgentsEditor agents={agents} onChange={onAgentsChanged} />
        </div>
    </div>
  );
}