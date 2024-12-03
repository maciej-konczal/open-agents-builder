'use client';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, User } from 'lucide-react';
import { useContext } from 'react';
import { DatabaseContext } from '@/contexts/db-context';

export function Header() {
  const dbContext = useContext(DatabaseContext);
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
      <div className="flex-1">
        <img src="/img/agent-doodle-logo.svg" alt="Agent Doodle" className="w-10"/>
      </div>
      <div className="flex-1"><h1 className="text-lg font-bold text-left">Agent Doodle</h1>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => {
              dbContext?.logout();
            }}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}