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
import React from 'react';
import { MDXEditorMethods } from '@mdxeditor/editor';
import { MarkdownEditor } from '@/components/markdown-editor';
import { SaveAgentAsTemplateButton } from '@/components/save-agent-as-template-button';

export default function SafetyRulesPage() {

  const { t } = useTranslation();
  const router = useRouter();
  const { current: agent, status, updateAgent } = useAgentContext();

  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm({
    defaultValues: agent ? agent.toForm(null) : {},
  });  
    const editors = {
      safetyRules: React.useRef<MDXEditorMethods>(null)
    }
  const { onSubmit, isDirty } = onAgentSubmit(agent, watch, setValue, getValues, updateAgent, t, router, editors);
  register('safetyRules', { required: t('Safety rules are required') });
   
  return (
    <div className="space-y-6">
      { isDirty ? (
        <AgentStatus status={{ id: 'dirty', message: t('You have unsaved changes'), type: 'warning' }} />
      ) : (
      <AgentStatus status={status} />
      ) }
            
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="safetyRules" className="block text-sm font-medium">
        {t('Safety rules')}
        </label>
        <Input type='hidden' id="id" {...register('id')} />
        <MarkdownEditor ref={editors.safetyRules} markdown={getValues('safetyRules') ?? agent?.safetyRules ?? ''} onChange={(e) => setValue('safetyRules', e)} diffMarkdown={agent?.safetyRules ?? ''} />
        {errors.safetyRules && <p className="mt-2 text-sm text-red-600">{errors.safetyRules.message}</p>}
      </div>
      <div className="flex justify-between">
        <Button
        type="submit"
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
        {t('Save')}
        </Button>

        <SaveAgentAsTemplateButton getFormValues={getValues} agent={agent} onSaved={function (): void {
            } } />
      </div>
      </form>
    </div>
  );
}