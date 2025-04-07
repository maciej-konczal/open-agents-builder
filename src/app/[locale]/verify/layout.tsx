'use client'

import initTranslations from '@/app/i18n';
import TranslationProvider from '@/app/translation-provider';
import { FSLoader } from '@/components/fs-loader';
import { ExecProvider } from '@/contexts/exec-context';
import { SaaSContextProvider } from '@/contexts/saas-context';
import React from 'react';
import { useEffect } from 'react';

const i18nNamespaces = ['translation'];

// eslint-disable-next-line @next/next/no-async-client-component
export default function GeneraChatlLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [resources, setResources] = React.useState<any>(null);

  useEffect(() => {
    initTranslations(params.locale, i18nNamespaces).then(({ resources }) => {
      setResources(resources);
      setIsInitializing(false);
    });
    }, [params.locale, i18nNamespaces]);
    return (
    isInitializing && !resources ? <FSLoader /> :
    <SaaSContextProvider>
      <TranslationProvider locale={params.locale} resources={resources} namespaces={i18nNamespaces}>
          {children}
      </TranslationProvider>
    </SaaSContextProvider>
  );
}