'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Play } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useAgents } from '@/hooks/use-projects';
import { useTranslation } from 'react-i18next';

export function AgentHeader() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const currentId = params?.id as string;
  const { projects } = useAgents();

  const handleAgentChange = (newId: string) => {
    router.push(`/agent/${newId}/general`);
  };

  return (
    <div className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <Select value={currentId} onValueChange={handleAgentChange}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder={t('Select project')} />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('Add Agent')}
        </Button>
      </div>
      <Button variant="secondary" size="sm">
        <Play className="mr-2 h-4 w-4" />
        {t('Preview')}
      </Button>
    </div>
  );
}