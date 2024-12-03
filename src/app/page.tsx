'use client'
// part of bundle size optimization (https://github.com/CatchTheTornado/doctor-dok/issues/67)
// const DynamicRecordsWrapper = dynamic(() => import('@/components/records-wrapper'), { ssr: false });
// const DynamicRecordContextProvider = dynamic(() => import('@/contexts/record-context'), { ssr: false });
// const DynamicChatContextProvider = dynamic(() => import('@/contexts/chat-context'), { ssr: false });
// const DynamicFolderContextProvider = dynamic(() => import('@/contexts/folder-context'), { ssr: false });
import { projects } from '@/lib/data/projects';
import { redirect } from 'next/navigation';

export default function HomePage() {
  const firstAgent = projects[0];
  redirect(`/project/${firstAgent.id}/general`);
}
