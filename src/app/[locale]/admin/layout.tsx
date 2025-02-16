'use client'

import initTranslations from '@/app/i18n';
import TranslationProvider from '@/app/translation-provider';
import AuthorizationGuard from '@/components/authorization-guard';
import { AgentHeader } from '@/components/layout/agent-header';
import { AgentSidebar } from '@/components/layout/agent-sidebar';
import { Header } from '@/components/layout/header';
import { SaaSNotifications } from '@/components/saas-notifications';
import { AgentProvider } from '@/contexts/agent-context';
import { AuditContextProvider } from '@/contexts/audit-context';
import { ConfigContextProvider } from '@/contexts/config-context';
import { DatabaseContextProvider } from '@/contexts/db-context';
import { KeyContextProvider } from '@/contexts/key-context';
import { SaaSContextProvider } from '@/contexts/saas-context';
import { StatsContextProvider } from '@/contexts/stats-context';
import { TemplateProvider } from '@/contexts/template-context';
import { useTranslation } from 'react-i18next';

const i18nNamespaces = ['translation'];

// eslint-disable-next-line @next/next/no-async-client-component
export default async function GeneralAgentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string, locale: string, databaseIdHash: string };
}) {
  const { resources } = await initTranslations(params.locale, i18nNamespaces);
  return (
    <TranslationProvider locale={params.locale} resources={resources} namespaces={i18nNamespaces}>
    <DatabaseContextProvider>
      <SaaSContextProvider>
        <ConfigContextProvider>
          <AuditContextProvider>
            <AuthorizationGuard>
              <KeyContextProvider>
                <StatsContextProvider>
                  <AgentProvider>
                    <TemplateProvider>
                      <div className={`hidden h-screen flex-col ${process.env.NEXT_PUBLIC_ENV === 'dev' ? '' : 'md:flex sm:flex xs:flex'} lg:hidden text-sm p-4`}>
                      <img src="/img/agent-doodle-logo.svg" alt="Agent Doodle" className="w-10 pb-4"/> 
                        Mobile layout is not yet supported for the admin app. <br />Please do use tablet or desktop resolutions to acces the app. Sorry!
                      </div>
                      <div className={`flex h-screen flex-col ${process.env.NEXT_PUBLIC_ENV === 'dev' ? '' : 'md:hidden sm:hidden xs:hidden'} lg:flex`}>
                        <Header />
                        <AgentHeader />
                        <SaaSNotifications />
                        <div className="flex flex-1 overflow-hidden">
                          {children}
                        </div>
                      </div>
                    </TemplateProvider>
                  </AgentProvider>
                </StatsContextProvider>
              </KeyContextProvider>
            </AuthorizationGuard>
          </AuditContextProvider>
        </ConfigContextProvider>
      </SaaSContextProvider>
    </DatabaseContextProvider>
    </TranslationProvider>
  );
}