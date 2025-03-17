'use client'
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import React, { useContext } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { KeyContext } from '@/contexts/key-context';
import { DatabaseContext } from '@/contexts/db-context';


export default function IntegrationsPage() {

  const { t } = useTranslation();
  const router = useRouter();
  const keysContext = useContext(KeyContext)
  const dbContext = useContext(DatabaseContext);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 text-sm">
          <p>{t('Integrations are Work in Progress. We will start adding CRM, eCommerce, ERP, PIM, Marketing Automation, CMS integrations shortly. Stay tuned. ')}</p>
          <p className="mt-4"><a className="text-blue-600 underline" href="https://github.com/CatchTheTornado/open-agents-builder">{t('Vist our Github')}</a>{t(' and check to contribute to the project if you need an integration quickly')}</p>
          <p className="mt-4">{t('Check our API interface for the current integration endpoints.')}</p>

        </CardContent>
      </Card>
    </div>
  );
}