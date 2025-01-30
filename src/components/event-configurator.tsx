'use client';

import { EventConfiguration } from '@/data/client/models';
import React from 'react';
import { useTranslation } from 'react-i18next';

type EventConfiguratorProps = {
  eventKey: string; // Unique ID for this event in the list/dict
  configuration: EventConfiguration;
  onChange: (key: string, updated: EventConfiguration) => void;
};

export function EventConfigurator({
  eventKey,
  configuration,
  onChange,
}: EventConfiguratorProps) {

  const { t } = useTranslation();

  const handleConditionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(eventKey, {
      ...configuration,
      condition: e.target.value,
    });
  };

  const handleActionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(eventKey, {
      ...configuration,
      action: e.target.value,
    });
  };

  return (
    <div>
      <div className="mb-2">
        <label className="block text-sm font-medium">{t('Condition')}</label>
        <input
          className="border p-2 rounded w-full text-sm"
          type="text"
          value={configuration.condition}
          onChange={handleConditionChange}
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium">{t('Action')}</label>
        <input
          className="border p-2 rounded w-full text-sm"
          type="text"
          value={configuration.action}
          onChange={handleActionChange}
        />
      </div>
    </div>
  );
}
