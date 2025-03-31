'use client';

import { on } from 'events';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

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

  // Keep local pieces of state so our inputs are controlled.
  const [shardName, setShardName] = React.useState(options.shardName);
  const [sessionOnly, setSessionOnly] = React.useState(!!options.sessionOnly);

  useEffect(() => {
    onChange({ ...options, sessionOnly: !!sessionOnly });
  }, []);

  const handleShardNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setShardName(value);
    onChange({ ...options, shardName: value });
  };

  const handleSessionOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSessionOnly(checked);
    onChange({ ...options, sessionOnly: checked });
  };

  return (
    <div className="space-y-2">
      {/* Shard Name Input */}
      <div className="flex items-center">
        <input
          id="shardName"
          className="border p-2 rounded text-sm mr-2"
          type="text"
          placeholder={t('Shard name') || 'Shard name'}
          value={shardName}
          onChange={handleShardNameChange}
        />
        <label htmlFor="shardName" className="block text-sm font-medium">
          {t('Optional shard identifier (for partitioning data)')}
        </label>
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
