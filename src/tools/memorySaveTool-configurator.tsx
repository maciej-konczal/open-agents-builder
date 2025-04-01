'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMemoryContext } from '@/contexts/memory-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MemorySaveToolConfiguratorProps {
  options: {
    storeName?: string;
    sessionOnly?: boolean;
  };
  onChange: (options: { storeName?: string; sessionOnly?: boolean }) => void;
}

export function MemorySaveToolConfigurator({
  options,
  onChange,
}: MemorySaveToolConfiguratorProps) {
  const { t } = useTranslation();
  const memoryContext = useMemoryContext();

  // Keep local pieces of state so our inputs are controlled.
  const [stores, setStores] = useState<{ file: string; displayName: string }[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      await memoryContext.loadFiles();
      if (memoryContext.files) {
        setStores(memoryContext.files.files.map(f => ({
          file: f.file,
          displayName: f.displayName
        })));
      }
    } catch (err) {
      toast.error(t('Failed to load stores'));
      console.error('Failed to load stores:', err);
    }
  };

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) {
      toast.error(t('Store name is required'));
      return;
    }

    setIsCreating(true);
    try {
      await memoryContext.createStore(newStoreName);
      await loadStores();
      onChange({ ...options, storeName: newStoreName });
      setShowCreateForm(false);
      setNewStoreName('');
    } catch (err) {
      toast.error(t('Failed to create store'));
      console.error('Failed to create store:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select 
          value={options.storeName || 'default'} 
          onValueChange={(value) => onChange({ ...options, storeName: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('Select a store')} />
          </SelectTrigger>
          <SelectContent>
            {stores.map((store) => (
              <SelectItem key={store.file} value={store.displayName}>
                {store.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? t('Cancel') : t('Create New')}
        </Button>
      </div>

      {showCreateForm && (
        <div className="flex items-center gap-2">
          <Input
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            placeholder={t('Store name')}
          />
          <Button
            onClick={handleCreateStore}
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {t('Create')}
          </Button>
        </div>
      )}
    </div>
  );
}
