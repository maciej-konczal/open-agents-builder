'use client'
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { onAgentSubmit } from '../general/page';
import { AgentStatus } from '@/components/layout/agent-status';
import { MarkdownEditor } from '@/components/markdown-editor';
import React, { useState } from 'react';
import { MDXEditorMethods } from '@mdxeditor/editor';
import { SaveAgentAsTemplateButton } from '@/components/save-agent-as-template-button';
import FlowsBuilder from '@/components/flows/flows-integrated-editor';
import { FlowAgentsEditor } from '@/components/flows/flows-agent-editor';
import { AgentDefinition } from '@/flows/models';

export default function AgentsPage() {

  const { t } = useTranslation();
  const router = useRouter();
  const { current: agent, status, updateAgent } = useAgentContext();

  const [agents, setAgents] = useState<AgentDefinition[]>([])
  
  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm({
    defaultValues: agent ? agent.toForm(null) : {},
  });  

    const editors = {
      expectedResult: React.useRef<MDXEditorMethods>(null)
    }

  const { onSubmit, isDirty } = onAgentSubmit(agent, watch, setValue, getValues, updateAgent, t, router, editors);

  return (
    <div className="space-y-6">
      { isDirty ? (
        <AgentStatus status={{ id: 'dirty', message: t('You have unsaved changes'), type: 'warning' }} />
      ) : (
      <AgentStatus status={status} />
      ) }

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
            <FlowAgentsEditor agents={agents} onChange={setAgents} />
        </div>
      </form>
    </div>
  );
}