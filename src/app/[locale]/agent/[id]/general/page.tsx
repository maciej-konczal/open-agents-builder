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

export default function GeneralPage() {
  const { t } = useTranslation();

  const { current: agent, updateAgent } = useAgentContext();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      displayName: agent?.displayName || '',
      welcomeInfo: agent?.options?.welcomeMessage || '',
      termsConditions: agent?.options?.termsAndConditions || '',
      confirmTerms: agent?.options?.mustConfirmTerms || false,
      resultEmail: agent?.options?.resultEmail || '',
      collectUserInfo: agent?.options?.collectUserEmail || false,
    },
  });

  useEffect(() => {
    if (agent) {
      setValue('displayName', agent.displayName);
      setValue('welcomeInfo', agent.options?.welcomeMessage || '');
      setValue('termsConditions', agent.options?.termsAndConditions || '');
      setValue('confirmTerms', agent.options?.mustConfirmTerms || false);
      setValue('resultEmail', agent.options?.resultEmail || '');
      setValue('collectUserInfo', agent.options?.collectUserEmail || false);
    }
  }, [agent, setValue]);

  const onSubmit = async (data) => {
    const updatedAgent = new Agent({
      id: agent?.id,
      displayName: data.displayName,
      exoectedResult: agent?.exoectedResult,
      prompt: agent?.prompt,
      createdAt: agent?.createdAt || getCurrentTS(),
      updatedAt: getCurrentTS(),
      options: {
        ...agent?.options,
        welcomeMessage: data.welcomeInfo,
        termsAndConditions: data.termsConditions,
        mustConfirmTerms: !!data.confirmTerms,
        resultEmail: data.resultEmail,
        collectUserEmail: !!data.collectUserInfo,
        collectUserName: !!data.collectUserInfo
      },
    } as Agent);
    try {
      console.log(updatedAgent)
      const response = await updateAgent(updatedAgent);
      toast.success(t('Agent updated successfully'));
    } catch (e) {
      console.error(e);
      toast.error(t('Failed to update agent'));
    }
  };
   
  return (
    <div className="space-y-6">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium">
        {t('Agent Name')}
        </label>
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
        <Textarea
        id="welcomeInfo"
        {...register('welcomeInfo')}
        rows={4}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.welcomeInfo && <p className="mt-2 text-sm text-red-600">{errors.welcomeInfo.message}</p>}
      </div>
      <div>
        <label htmlFor="termsConditions" className="block text-sm font-medium">
        {t('Terms and Conditions')}
        </label>
        <Textarea
        id="termsConditions"
        {...register('termsConditions')}
        rows={4}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
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