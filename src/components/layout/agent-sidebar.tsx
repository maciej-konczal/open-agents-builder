'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings2, FileText, Shield, BarChart, BookTemplateIcon, BookIcon, CogIcon, FunctionSquareIcon, MessageCircleMore, CalendarIcon, BoxesIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

const sidebarItems = [
  { 
    icon: Settings2, 
    label: 'General', 
    href: '/admin/agent/[id]/general',
    pattern: '/admin/agent/[id]/general'
  },
  { 
    icon: FileText, 
    label: 'Prompt', 
    href: '/admin/agent/[id]/prompt',
    pattern: '/admin/agent/[id]/prompt'
  },
  { 
    icon: BookTemplateIcon, 
    label: 'Expected result', 
    href: '/admin/agent/[id]/expected-result',
    pattern: '/admin/agent/[id]/expected-result'
  },
  {
    icon: CogIcon,
    label: 'Tools',
    href: '/admin/agent/[id]/tools',
    pattern: '/admin/agent/[id]/tools'
  },
  {
    icon: FunctionSquareIcon,
    label: 'Events',
    href: '/admin/agent/[id]/events',
    pattern: '/admin/agent/[id]/events'
  },

  { 
    icon: Shield, 
    label: 'Safety Rules', 
    href: '/admin/agent/[id]/safety',
    pattern: '/admin/agent/[id]/safety'
  },
  { 
    icon: BoxesIcon, 
    label: 'Products and services', 
    href: '/admin/agent/[id]/products',
    pattern: '(.*)/products/(.*)',
    activeOnlyOnSavedAgent: true
  },
  { 
    icon: MessageCircleMore, 
    label: 'Sessions', 
    href: '/admin/agent/[id]/sessions',
    pattern: '/admin/agent/[id]/sessions',
    activeOnlyOnSavedAgent: true
  },
  { 
    icon: BookIcon, 
    label: 'Results', 
    href: '/admin/agent/[id]/results',
    pattern: '/admin/agent/[id]/results',
    activeOnlyOnSavedAgent: true
  },
  { 
    icon: CalendarIcon, 
    label: 'Calendar', 
    href: '/admin/agent/[id]/calendar',
    pattern: '/admin/agent/[id]/calendar',
    activeOnlyOnSavedAgent: true
  },
];

export function AgentSidebar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const params = useParams();
  const agentId = params?.id as string;

  return (
    <div className="flex w-64 flex-col border-r bg-card">
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {sidebarItems.map((item) => {
            const href = item.href.replace('[id]', agentId);
            const isActive = pathname.endsWith(href) || pathname.match(item.pattern)
            
            
            if (item.activeOnlyOnSavedAgent && (!agentId || agentId === 'new')) {
              return (
                <Button
                key={item.href}
                disabled={true}
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start"
              >                
                <item.icon className="mr-2 h-5 w-5" />
                {t(item.label)}                
                </Button>
              )
            } else {
              return (
                <Link key={item.href} href={href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    <item.icon className="mr-2 h-5 w-5" />
                    {t(item.label)}
                  </Button>
                </Link>
              );
            }
           })
          }
        </div>
      </ScrollArea>
    </div>
  );
}