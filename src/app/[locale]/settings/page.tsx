'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useContext, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { nanoid } from 'nanoid';
import { Agent } from '@/data/client/models';
import { toast } from 'sonner';
import { getCurrentTS } from '@/lib/utils';
import { coercedVal, ConfigContext } from '@/contexts/config-context';
import { DatabaseContext } from '@/contexts/db-context';
import { set } from 'date-fns';

export default function PromptPage() {
  const { t } = useTranslation();

  const configContext = useContext(ConfigContext);
  const dbContext = useContext(DatabaseContext);  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      chatGptApiKey: '',
    },
  });

  useEffect(() => {
    async function loadConfig () {
      setValue('chatGptApiKey', await configContext?.getServerConfig('chatGptApiKey') as string || '');
    }
    loadConfig();

  }, [dbContext?.email]);

  const onSubmit = async (data) => {
    try {
      configContext?.setServerConfig('chatGptApiKey', data.chatGptApiKey);
      toast.success(t('Settings saved successfully'));
    } catch (e) {
      console.error(e);
      toast.error(t('Failed to update agent'));
    }
  };
   
  return (
    <div className="space-y-6">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="apiKey" className="block text-sm font-medium">
        {t('OpenAI API Key')}
        </label>
        <Input
        type="text"
        id="chatGptApiKey"
        {...register('chatGptApiKey', { required: t('This field is required') })}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.chatGptApiKey && <p className="mt-2 text-sm text-red-600">{errors.chatGptApiKey.message}</p>}
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