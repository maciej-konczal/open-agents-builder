'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShortMemoryContext } from '@/contexts/short-memory-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { Plus } from 'lucide-react';

/** The shape of the options this configurator manages. */
type ContextVectorStoreOptions = {
  shardName: string;
  sessionOnly: boolean;
};

/** Props for the configurator component. */
type ContextVectorStoreConfiguratorProps = {
  /** Current options. */
  options: ContextVectorStoreOptions;
  /** Callback when the user changes anything. */
  onChange: (updated: ContextVectorStoreOptions) => void;
};

/**
 * A configurator for ContextVectorStore that allows the user to set or change the shardName
 * and to toggle whether data is stored only for the session (sessionOnly).
 */
export function ContextVectorStoreConfigurator({
  options,
  onChange
}: ContextVectorStoreConfiguratorProps) {
  const { t } = useTranslation();
  const shortMemoryContext = useShortMemoryContext();

  // Keep local pieces of state so our inputs are controlled.
  const [shardName, setShardName] = useState(options.shardName);
  const [sessionOnly, setSessionOnly] = useState(!!options.sessionOnly);
  const [stores, setStores] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);

  // Load existing stores
  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const response = await shortMemoryContext.queryFiles({
        limit: 100,
        offset: 0
      });
      const storeNames = response.files.map(f => f.displayName || f.file.replace(/\.json$/, ''));
      setStores(storeNames);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleShardNameChange = (value: string) => {
    setShardName(value);
    onChange({ ...options, shardName: value });
  };

  const handleSessionOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSessionOnly(checked);
    onChange({ ...options, sessionOnly: checked });
  };

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) {
      toast.error(t("Please enter a store name"));
      return;
    }

    setIsCreating(true);
    try {
      await shortMemoryContext.createStore(newStoreName);
      await loadStores();
      handleShardNameChange(newStoreName);
      setNewStoreName('');
      setShowCreateInput(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Store Selection or Creation */}
      <div className="space-y-2">
        <label className="block text-sm font-medium mb-1">
          {t('Select or Create Store')}
        </label>
        {!showCreateInput ? (
          <div className="flex gap-2">
            <Select
              value={shardName}
              onValueChange={handleShardNameChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('Select store...')} />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store} value={store}>
                    {store}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setShowCreateInput(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('New Store')}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              placeholder={t('Enter store name...') || ''}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateStore();
                }
              }}
            />
            <Button
              onClick={handleCreateStore}
              disabled={isCreating}
            >
              {t('Create')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateInput(false);
                setNewStoreName('');
              }}
            >
              {t('Cancel')}
            </Button>
          </div>
        )}
      </div>

      {/* Session Only Checkbox */}
      <div className="flex items-center">
        <input
          id="sessionOnly"
          type="checkbox"
          className="border p-2 rounded text-sm mr-2"
          checked={sessionOnly}
          onChange={handleSessionOnlyChange}
        />
        <label htmlFor="sessionOnly" className="block text-sm font-medium">
          {t('Store data only for the current session (data is removed after session ends)')}
        </label>
      </div>
    </div>
  );
}
