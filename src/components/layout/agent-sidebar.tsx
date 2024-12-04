'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings2, FileText, Shield, BarChart } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

const sidebarItems = [
  { 
    icon: Settings2, 
    label: 'General', 
    href: '/agent/[id]/general',
    pattern: '/agent/[id]/general'
  },
  { 
    icon: FileText, 
    label: 'Prompt', 
    href: '/agent/[id]/prompt',
    pattern: '/agent/[id]/prompt'
  },
  { 
    icon: Shield, 
    label: 'Safety Rules', 
    href: '/agent/[id]/safety',
    pattern: '/agent/[id]/safety'
  },
  { 
    icon: BarChart, 
    label: 'Results', 
    href: '/agent/[id]/results',
    pattern: '/agent/[id]/results'
  },
];

export function AgentSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params?.id as string;

  return (
    <div className="flex w-64 flex-col border-r bg-card">
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {sidebarItems.map((item) => {
            const href = item.href.replace('[id]', projectId);
            const isActive = pathname.startsWith(href);
            
            return (
              <Link key={item.href} href={href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start"
                >
                  <item.icon className="mr-2 h-5 w-5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}