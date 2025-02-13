'use client'

import initTranslations from '@/app/i18n';
import TranslationProvider from '@/app/translation-provider';
import AuthorizationGuard from '@/components/authorization-guard';
import { ChatProvider } from '@/contexts/chat-context';
import { DatabaseContextProvider } from '@/contexts/db-context';
import { SaaSContextProvider } from '@/contexts/saas-context';

const i18nNamespaces = ['translation'];

// eslint-disable-next-line @next/next/no-async-client-component
export default async function SharingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { resources } =  await initTranslations(params.locale, i18nNamespaces);

  return (
    <TranslationProvider locale={params.locale} resources={resources} namespaces={i18nNamespaces}>
      <DatabaseContextProvider>
        <SaaSContextProvider>
          <AuthorizationGuard sharingView={true}>
            {children}
          </AuthorizationGuard>
        </SaaSContextProvider>
      </DatabaseContextProvider>
    </TranslationProvider>
  );
}