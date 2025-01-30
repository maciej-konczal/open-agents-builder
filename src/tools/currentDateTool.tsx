'use client';

import React from 'react';
import { z } from 'zod';
import { tool } from 'ai';
import { useTranslation } from 'react-i18next';

type CurrentDateConfiguratorProps = {
  // This tool needs no special options, but we keep the shape for consistency:
  options: Record<string, never>;
  onChange: (updated: Record<string, never>) => void;
};

export function CurrentDateConfigurator({ options, onChange }: CurrentDateConfiguratorProps) {
  const { t } = useTranslation();
  // No config needed, but here's a placeholder:
  return <p className="text-sm text-gray-600">{t('No configuration required for currentDate tool.')}</p>;
}

export const currentDateTool = {
  configurator: CurrentDateConfigurator,
  displayName: 'Get current date',
  executor: tool({
    description: 'Get the current date',
    parameters: z.object({}),
    execute: async () => {
      return new Date().toISOString();
    },
  }),
};
