'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { nanoid } from 'nanoid';
import { Agent } from '@/data/client/models';
import { toast } from 'sonner';
import { getCurrentTS } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function PromptPage() {
  const { t } = useTranslation();

  const router = useRouter();
  const { current: agent, updateAgent } = useAgentContext();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      prompt: agent?.prompt || '',
    },
  });

  useEffect(() => {
    if (agent) {
      if (agent?.id === 'new') {
        toast.error(t('Please set the general info and save the agent first.'));
        router.push(`/agent/new/general`);
      }      
      setValue('prompt', agent.prompt || '');
    } else {
      toast.error(t('Failed to load agent. Please set the general info and save the agent first.'));
    }
  }, [agent, setValue]);

  const onSubmit = async (data) => {
    const updatedAgent = new Agent({
      ...agent,
      prompt: data.prompt || '',
    } as Agent);

    try {
      console.log(updatedAgent)
      const response = await updateAgent(updatedAgent);
      toast.success(t('Agent saved successfully'));
    } catch (e) {
      console.error(e);
      toast.error(t('Failed to update agent'));
    }
  };
   
  return (
    <div className="space-y-6">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium">
        {t('Agent prompt')}
        </label>
        <Textarea
        id="prompt"
        {...register('prompt', { required: t('Prompt is required') })}
        rows={4}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
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