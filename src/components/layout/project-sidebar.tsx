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
    href: '/project/[id]/general',
    pattern: '/project/[id]/general'
  },
  { 
    icon: FileText, 
    label: 'Prompt', 
    href: '/project/[id]/prompt',
    pattern: '/project/[id]/prompt'
  },
  { 
    icon: Shield, 
    label: 'Safety Rules', 
    href: '/project/[id]/safety',
    pattern: '/project/[id]/safety'
  },
  { 
    icon: BarChart, 
    label: 'Results', 
    href: '/project/[id]/results',
    pattern: '/project/[id]/results'
  },
];

export function ProjectSidebar() {
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