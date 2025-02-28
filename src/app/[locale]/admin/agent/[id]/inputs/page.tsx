'use client'
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useForm } from 'react-hook-form';
import { useParams, useRouter } from 'next/navigation';
import { onAgentSubmit } from '../general/page';
import { AgentStatus } from '@/components/layout/agent-status';
import React, { useEffect, useState } from 'react';
import { MDXEditorMethods } from '@mdxeditor/editor';
import { FlowInputVariable } from '@/flows/models';
import { FlowInputVariablesEditor } from '@/components/flows/flows-input-variables-editor';

export default function InputsPage() {

  const { t } = useTranslation();
  const router = useRouter();
  const { current: agent, dirtyAgent, status, updateAgent } = useAgentContext();

  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm({
    defaultValues: agent ? agent.toForm(null) : {},
  });  

  const params = useParams();
  const variables = watch('inputs') ?? [];
  register('inputs')
  const onVariablesChanged = (value: FlowInputVariable[]) => {
    setValue('inputs', value);
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
            <FlowInputVariablesEditor variables={variables} onChange={onVariablesChanged} />
        </div>
    </div>
  );
}