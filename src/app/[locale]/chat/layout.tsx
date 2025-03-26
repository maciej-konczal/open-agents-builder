'use client'

import initTranslations from '@/app/i18n';
import TranslationProvider from '@/app/translation-provider';
import { FSLoader } from '@/components/fs-loader';
import { ThemeProvider } from '@/components/theme-provider';
import { ExecProvider } from '@/contexts/exec-context';
import React, { useEffect } from 'react';

const i18nNamespaces = ['translation'];

// eslint-disable-next-line @next/next/no-async-client-component
export default function GeneraChatlLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string, locale: string };
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
    <TranslationProvider locale={params.locale} resources={resources} namespaces={i18nNamespaces}>
      <ExecProvider>
      <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </ExecProvider>
    </TranslationProvider>
  );
}