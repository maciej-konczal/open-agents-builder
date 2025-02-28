'use client'
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { onAgentSubmit } from '../general/page';
import { AgentStatus } from '@/components/layout/agent-status';
import React, { useState } from 'react';
import { MDXEditorMethods } from '@mdxeditor/editor';
import { FlowInputVariable } from '@/flows/models';
import { FlowInputVariablesEditor } from '@/components/flows/flows-input-variables-editor';

export default function InputsPage() {

  const { t } = useTranslation();
  const router = useRouter();
  const { current: agent, status, updateAgent } = useAgentContext();

  const [variables, setVariables] = useState<FlowInputVariable[]>([])

  const onVariablesChanged = (value: FlowInputVariable[]) => {
    setValue('inputs', variables);
    setVariables(value);
  }
  
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
            <FlowInputVariablesEditor variables={variables} onChange={onVariablesChanged} />
        </div>
      </form>
    </div>
  );
}