'use client'

import { AgentHeader } from '@/components/layout/agent-header';
import { AgentSidebar } from '@/components/layout/agent-sidebar';
import { Header } from '@/components/layout/header';
import { DatabaseContextProvider } from '@/contexts/db-context';
import { SaaSContextProvider } from '@/contexts/saas-context';
import { ConfigContextProvider } from '@/contexts/config-context';
import { AuditContextProvider } from '@/contexts/audit-context';
import AuthorizationGuard from '@/components/authorization-guard';
import { KeyContextProvider } from '@/contexts/key-context';
import { AgentProvider } from '@/contexts/agent-context';
import i18n from '@/app/i18n';
import { I18nextProvider } from 'react-i18next';

export default function AgentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <I18nextProvider i18n={i18n} defaultNS={'translation'}>
      <DatabaseContextProvider>
        <SaaSContextProvider>
          <ConfigContextProvider>
            <AuditContextProvider>
              <AuthorizationGuard>
                <KeyContextProvider>
                  <AgentProvider>
                    <div className="flex h-screen flex-col">
                      <Header />
                      <AgentHeader />
                      <div className="flex flex-1 overflow-hidden">
                        <AgentSidebar />
                        <main className="flex-1 overflow-auto p-6">
                          {children}
                        </main>
                      </div>
                    </div>
                  </AgentProvider>
                </KeyContextProvider>
              </AuthorizationGuard>
            </AuditContextProvider>
          </ConfigContextProvider>
        </SaaSContextProvider>
      </DatabaseContextProvider>
      </I18nextProvider>
  );
}