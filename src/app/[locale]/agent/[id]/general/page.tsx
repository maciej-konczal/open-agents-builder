'use client'
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useEffect, useState } from 'react';
import { useForm, UseFormGetValues, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Agent } from '@/data/client/models';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import { sha256 } from '@/lib/crypto';
import { TFunction } from 'i18next';
import { AgentStatus } from '@/components/layout/agent-status';
import { MarkdownEditor } from '@/components/markdown-editor';


export function onAgentSubmit(agent: Agent | null, watch: UseFormWatch<Record<string, any>>, setValue: UseFormSetValue<Record<string, any>>, getValues: UseFormGetValues<Record<string, any>>, updateAgent: (agent: Agent, setAsCurrent: boolean) => Promise<Agent>, t: TFunction<"translation", undefined>, router: AppRouterInstance) {
  const [isDirty, setIsDirty] = useState(false);
  const params = useParams();
  const agentContext = useAgentContext();

  useEffect(() => {
    if (agent && agent.id === params.id) { // bind the tracking changes only for the currently selected agent
      //agent.toForm(setValue); // load the database values
        const dirtyCheck = (async (originalRecord: Record<string, any>, value: Record<string, any>) => {
          const compareForms =async (editableForm: Record<string, any>, savedForm: Record<string, any>) => {
            const sortedSavedState:Record<string, any> = {}
            const sortedEditableState = Object.keys(editableForm).sort().reduce((acc: Record<string, any>, key: string) => {
              acc[key] = editableForm[key];
              sortedSavedState[key] = savedForm[key];
              return acc;
            }, {});

            const editableEntriesString = Object.entries(sortedEditableState).map(([key, value]) => `${key}:${value}`).join(',');
            const savedEntriesString = Object.entries(sortedSavedState).map(([key, value]) => `${key}:${value}`).join(',');
            const [editableEntriesHash, savedEntriesHash] = await Promise.all([
              sha256(editableEntriesString, ''),
              sha256(savedEntriesString, '')
            ]);

            return editableEntriesHash === savedEntriesHash;
          };

        const formChanged = !await compareForms(getValues(), originalRecord); 
        if (formChanged) {
          sessionStorage.setItem(`agent-${value['id']}`, JSON.stringify(getValues())); // save form values
        } else {
          sessionStorage.removeItem(`agent-${value['id']}`);
        }
        setIsDirty(formChanged);
      })

      const subscribeChanges = (originalRecord: Record<string, any>) => {
        dirtyCheck(originalRecord, getValues());
          return watch((value) => {
            dirtyCheck(originalRecord, value);
          });
      };

      const savedState = sessionStorage.getItem(`agent-${agent.id}`);
      if (savedState) { // the form is dirty - load state from session storage
        const parsedState = JSON.parse(savedState);
        Object.keys(parsedState).forEach((key) => {
          setValue(key, parsedState[key]);
        });
      } else {
        agent.toForm(setValue)
      }
      subscribeChanges(agent.toForm(null));

    }   
  }, [agent]);

  const onSubmit = async (data: Record<string, any>) => {

    const newAgent = agent?.id === 'new';
    const updatedAgent = Agent.fromForm(data, agent);
    if (!updatedAgent.prompt) {
      router.push(`/agent/${updatedAgent.id}/prompt`);
      toast.error(t('Prompt is required'));
      agentContext.setStatus({
        id: 'prompt-required',
        message: t('Prompt is required'),
        type: 'error'
      });
      return;
    }
    if (!updatedAgent.expectedResult) {
      router.push(`/agent/${updatedAgent.id}/expected-result`);
      toast.error(t('Expected result is required'));
      agentContext.setStatus({
        id: 'expected-result-required',
        message: t('Expected result is required'),
        type: 'error'
      });      
      return;
    }

    try {
      const response = await updateAgent(updatedAgent, true);
      toast.success(t('Agent updated successfully'));
      agentContext.setStatus({
        id: 'agent-updated',
        message: t('Agent updated successfully'),
        type: 'success'
      });
      if (newAgent)
        sessionStorage.removeItem(`agent-new`);
      else
        sessionStorage.removeItem(`agent-${updatedAgent.id}`);

      if (newAgent) router.push(`/agent/${response.id}/general`);
    } catch (e) {
      console.error(e);
      toast.error(t('Failed to update agent'));
    }
  };
  return { onSubmit, isDirty, setIsDirty }
}


export default function GeneralPage() {


  const { t } = useTranslation();
  const router = useRouter();
  const { setStatus, status, removeStatus, current: agent, updateAgent } = useAgentContext();

  const { register, handleSubmit, getValues, setValue, watch, formState: { errors } } = useForm({
    defaultValues: agent ? agent.toForm(null) : {},
  });  
  register('welcomeInfo');
  register('termsAndConditions');

  const { onSubmit, isDirty } = onAgentSubmit(agent, watch, setValue, getValues, updateAgent, t, router);

  useEffect(() => {
    if (isDirty) {
      setStatus({ id: 'dirty', message: t('You have unsaved changes'), type: 'warning' });
    } else  {
      removeStatus('dirty');
    }
  }, [isDirty]);
   
  return (
    <div className="space-y-6">
      { isDirty ? (
        <AgentStatus status={{ id: 'dirty', message: t('You have unsaved changes'), type: 'warning' }} />
      ) : (
      <AgentStatus status={status} />
      ) }

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium">
        {t('Agent Name')}
        </label>
        <Input type='hidden' id="id" {...register('id')} />
        <Input
        type="text"
        id="displayName"
        {...register('displayName', { required: t('This field is required') })}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.displayName && <p className="mt-2 text-sm text-red-600">{errors.displayName.message}</p>}
      </div>
      <div>
        <label htmlFor="welcomeInfo" className="block text-sm font-medium">
        {t('Welcome Message')}
        </label>
        <MarkdownEditor markdown={getValues()['welcomeInfo'] ?? ''} onChange={(e) => setValue('welcomeInfo', e)} diffMarkdown={agent?.options?.welcomeMessage ?? ''} />
        {errors.welcomeInfo && <p className="mt-2 text-sm text-red-600">{errors.welcomeInfo.message}</p>}
      </div>
      <div>
        <label htmlFor="termsConditions" className="block text-sm font-medium">
        {t('Terms and Conditions')}
        </label>
        <MarkdownEditor markdown={getValues()['termsConditions'] ?? ''} onChange={(e) => setValue('termsConditions', e)} diffMarkdown={agent?.options?.termsAndConditions ?? ''} />
        {errors.termsConditions && <p className="mt-2 text-sm text-red-600">{errors.termsConditions.message}</p>}
      </div>
      <div>
        <label htmlFor="confirmTerms" className="flex items-center text-sm font-medium">
        <Input
          type="checkbox"
          id="confirmTerms"
          {...register('confirmTerms')}
          className="mr-2 w-4"
        />
        {t('Must confirm terms and conditions')}
        </label>
        {errors.confirmTerms && <p className="mt-2 text-sm text-red-600">{errors.confirmTerms.message}</p>}
      </div>
      <div>
        <label htmlFor="resultEmail" className="block text-sm font-medium">
        {t('Result Email')}
        </label>
        <Input
        type="email"
        id="resultEmail"
        {...register('resultEmail', { pattern: { value: /^\S+@\S+$/i, message: t('Invalid email address') } })}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.resultEmail && <p className="mt-2 text-sm text-red-600">{errors.resultEmail.message}</p>}
      </div>
      <div>
        <label htmlFor="collectUserInfo" className="flex items-center text-sm font-medium">
        <Input
          type="checkbox"
          id="collectUserInfo"
          {...register('collectUserInfo')}
          className="mr-2 w-4"
        />
        {t('Collect user e-mail addresses and names')}
        </label>
        {errors.collectUserInfo && <p className="mt-2 text-sm text-red-600">{errors.collectUserInfo.message}</p>}
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

