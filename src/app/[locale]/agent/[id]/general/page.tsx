'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useEffect } from 'react';

export default function GeneralPage() {
  const { t } = useTranslation();
  import { useForm } from 'react-hook-form';

  const { current: agent } = useAgentContext();
  const { register, handleSubmit, setValue } = useForm({
    defaultValues: {
      displayName: agent?.displayName || '',
      welcomeInfo: agent?. || '',
      termsConditions: agent?.termsConditions || '',
      confirmTerms: agent?. || false,
      resultEmail: agent?.resultEmail || '',
      collectUserInfo: agent?.collectUserInfo || false,
    },
  });

  useEffect(() => {
    if (agent) {
      setValue('projectName', agent.name);
      setValue('welcomeInfo', agent.welcomeMessage);
      setValue('termsConditions', agent.termsConditions);
      setValue('confirmTerms', agent.confirmTerms);
      setValue('resultEmail', agent.resultEmail);
      setValue('collectUserInfo', agent.collectUserInfo);
    }
  }, [agent, setValue]);

  const onSubmit = (data) => {
    console.log(data);
  };
   
  return (
    <div className="space-y-6">
      <form className="space-y-4">
      <div>
        <label htmlFor="projectName" className="block text-sm font-medium">
        {t('Agent Name')}
        </label>
        <Input
        type="text"
        id="displayName"
        name="displayName"
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="welcomeInfo" className="block text-sm font-medium">
          {t('Welcome Message')}
        </label>
        <Textarea
          id="welcomeInfo"
          name="welcomeInfo"
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="termsConditions" className="block text-sm font-medium">
          {t('Terms and Conditions')}
        </label>
        <Textarea
          id="termsConditions"
          name="termsConditions"
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="confirmTerms" className="flex items-center text-sm font-medium">
          <Input
        type="checkbox"
        id="confirmTerms"
        name="confirmTerms"
        className="mr-2 w-4"
          />
          {t('Must confirm terms and conditions')}
        </label>
      </div>
      <div>
        <label htmlFor="resultEmail" className="block text-sm font-medium">
        {t('Result Email')}
        </label>
        <Input
        type="email"
        id="resultEmail"
        name="resultEmail"
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="collectUserInfo" className="flex items-center text-sm font-medium">
          <Input
            type="checkbox"
            id="collectUserInfo"
            name="collectUserInfo"
            className="mr-2 w-4"
          />
          {t('Collect user e-mail addresses and names')}
        </label>
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