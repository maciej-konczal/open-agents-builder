'use client'
import { ConfigContextProvider } from "@/contexts/config-context";
import {  DatabaseContextProvider } from "@/contexts/db-context";
import AuthorizationGuard from "@/components/authorization-guard";
import { KeyContextProvider } from "@/contexts/key-context";
import { SaaSContextProvider } from "@/contexts/saas-context";
import { CookieConsentBannerComponent } from "@/components/cookie-consent-banner";
import { AuditContextProvider } from "@/contexts/audit-context";

// part of bundle size optimization (https://github.com/CatchTheTornado/doctor-dok/issues/67)
// const DynamicRecordsWrapper = dynamic(() => import('@/components/records-wrapper'), { ssr: false });
// const DynamicRecordContextProvider = dynamic(() => import('@/contexts/record-context'), { ssr: false });
// const DynamicChatContextProvider = dynamic(() => import('@/contexts/chat-context'), { ssr: false });
// const DynamicFolderContextProvider = dynamic(() => import('@/contexts/folder-context'), { ssr: false });
import { projects } from '@/lib/data/projects';
import { redirect } from 'next/navigation';

export default function HomePage() {
  const firstProject = projects[0];
  redirect(`/project/${firstProject.id}/general`);
}
