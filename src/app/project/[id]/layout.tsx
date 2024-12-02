'use client'

import { ProjectHeader } from '@/components/layout/project-header';
import { ProjectSidebar } from '@/components/layout/project-sidebar';
import { Header } from '@/components/layout/header';
import { DatabaseContextProvider } from '@/contexts/db-context';
import { SaaSContextProvider } from '@/contexts/saas-context';
import { ConfigContextProvider } from '@/contexts/config-context';
import { AuditContextProvider } from '@/contexts/audit-context';
import AuthorizationGuard from '@/components/authorization-guard';
import { KeyContextProvider } from '@/contexts/key-context';

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <DatabaseContextProvider>
      <SaaSContextProvider>
        <ConfigContextProvider>
          <AuditContextProvider>
            <AuthorizationGuard>
              <KeyContextProvider>
                <div className="flex h-screen flex-col">
                  <Header />
                  <ProjectHeader />
                  <div className="flex flex-1 overflow-hidden">
                    <ProjectSidebar />
                    <main className="flex-1 overflow-auto p-6">
                      {children}
                    </main>
                  </div>
                </div>
              </KeyContextProvider>
            </AuthorizationGuard>
          </AuditContextProvider>
        </ConfigContextProvider>
      </SaaSContextProvider>
    </DatabaseContextProvider>
  );
}