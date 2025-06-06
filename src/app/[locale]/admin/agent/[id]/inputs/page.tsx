'use client'
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useForm } from 'react-hook-form';
import { useParams, useRouter } from 'next/navigation';
import { onAgentSubmit } from '../general/page';
import { AgentStatus } from '@/components/layout/agent-status';
import React, { useEffect, useState } from 'react';
import { MDXEditorMethods } from '@mdxeditor/editor';
import { FlowInputVariable, inputValidators } from '@/flows/models';
import { FlowInputVariablesEditor } from '@/components/flows/flows-input-variables-editor';
import { Button } from '@/components/ui/button';

export default function InputsPage() {

  const { t } = useTranslation();
  const router = useRouter();
  const { current: agent, dirtyAgent, status, updateAgent } = useAgentContext();

  const { register, handleSubmit, setValue, getValues, watch, formState: { errors }, setError } = useForm({
    defaultValues: agent ? agent.toForm(null) : {},
  });  

  const params = useParams();
  const variables = watch('inputs') ?? [];
  register('inputs', inputValidators({ t, setError }));

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

        <Button onClick={handleSubmit(onSubmit)}
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
        {t('Save')}
        </Button>        

    </div>
  );
}