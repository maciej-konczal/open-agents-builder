'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LayoutDashboard, Users, Settings, BarChart3, Files, Menu } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Users', href: '/dashboard/users' },
  { icon: Files, label: 'Content', href: '/dashboard/content' },
  { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={cn(
      'flex flex-col border-r bg-card',
      collapsed ? 'w-16' : 'w-64',
      'transition-all duration-300'
    )}>
      <div className="flex h-14 items-center border-b px-4">
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
          <Menu className="h-5 w-5" />
        </Button>
        {!collapsed && <span className="ml-2 font-semibold">Admin Panel</span>}
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {sidebarItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start',
                  collapsed ? 'px-2' : 'px-4'
                )}
              >
                <item.icon className={cn('h-5 w-5', !collapsed && 'mr-2')} />
                {!collapsed && item.label}
              </Button>
            </Link>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}