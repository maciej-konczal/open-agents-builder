'use client'
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { onAgentSubmit } from '../general/page';

export default function PromptPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { current: agent, updateAgent } = useAgentContext();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: agent ? agent.toForm(null) : {},
  });  

  const onSubmit = onAgentSubmit(agent, watch, setValue, updateAgent, t, router);
   
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