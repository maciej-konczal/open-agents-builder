'use client'

import { AgentSidebar } from '@/components/layout/agent-sidebar';

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