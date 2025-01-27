'use client'
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { onAgentSubmit } from '../general/page';
import { Input } from '@/components/ui/input';
import { AgentStatus } from '@/components/layout/agent-status';
import { MarkdownEditor } from '@/components/markdown-editor';
import React from 'react';
import { MDXEditorMethods } from '@mdxeditor/editor';

export default function PromptPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { current: agent, status, updateAgent } = useAgentContext();

  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm({
    defaultValues: agent ? agent.toForm(null) : {},
  });  
  const editors = {
    prompt: React.useRef<MDXEditorMethods>(null)
  }
  const { onSubmit, isDirty } = onAgentSubmit(agent, watch, setValue, getValues, updateAgent, t, router, editors);
  register('prompt', { required: t('Prompt is required') });
   
  return (
    <div className="space-y-6">
      { isDirty ? (
        <AgentStatus status={{ id: 'dirty', message: t('You have unsaved changes'), type: 'warning' }} />
      ) : (
      <AgentStatus status={status} />
      ) }

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium">
        {t('Agent prompt')}
        </label>
        <Input type='hidden' id="id" {...register('id')} />
        <MarkdownEditor ref={editors.prompt} markdown={getValues('prompt') ?? agent?.prompt ?? ''} onChange={(e) => setValue('prompt', e)} diffMarkdown={agent?.prompt ?? ''} />
        {errors.prompt && <p className="mt-2 text-sm text-red-600">{errors.prompt.message}</p>}
      </div>
      <div>
        <Button
        type="submit"
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
        {t('Save')}
        </Button>
      </div>
      </form>
    </div>
  );
}