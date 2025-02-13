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

const i18nNamespaces = ['translation'];

// eslint-disable-next-line @next/next/no-async-client-component
export default function GeneralAgentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string, locale: string };
}) {

  return (
    <>
      <AgentSidebar />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </>
  );
}