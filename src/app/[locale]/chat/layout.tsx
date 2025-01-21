'use client'

import initTranslations from '@/app/i18n';
import TranslationProvider from '@/app/translation-provider';

const i18nNamespaces = ['translation'];

// eslint-disable-next-line @next/next/no-async-client-component
export default async function GeneraChatlLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string, locale: string };
}) {
  const { resources } = await initTranslations(params.locale, i18nNamespaces);

  return (
    <TranslationProvider locale={params.locale} resources={resources} namespaces={i18nNamespaces}>
      {children}
    </TranslationProvider>
  );
}