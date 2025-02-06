'use client';

import React from 'react';
import { toolConfigurators } from '@/tools/configurators'; // or wherever your registry is located
import { ToolConfiguration } from '@/data/client/models';
import { useTranslation } from 'react-i18next';

type ToolConfiguratorProps = {
  toolKey: string;
  configuration: ToolConfiguration;
  onChange: (key: string, updated: ToolConfiguration) => void;
};

export function ToolConfigurator({ toolKey, configuration, onChange }: ToolConfiguratorProps) {
  // The registry object looks like: { sendEmail: {...}, currentDate: {...}, ... }
  // We'll get its keys for the select.
  const registryKeys = Object.keys(toolConfigurators);
  const { t } = useTranslation();

  // If the current tool doesn't exist in the registry, show an error
  const toolConfiguratorDescriptor = toolConfigurators[configuration.tool as keyof typeof toolConfigurators];
  if (!toolConfiguratorDescriptor) {
    return (
      <div className="border p-3 mb-3 rounded">
        <p className="text-red-500">{t('Unknown tool type')}: {configuration.tool}</p>
      </div>
    );
  }

  // This is the specific React component (configurator UI) for the chosen tool
  const Configurator = toolConfiguratorDescriptor.configurator as unknown as React.ComponentType<{
    options: Record<string, any>;
    onChange: (updated: Record<string, any>) => void;
  }>;

  // Handlers for changes
  const handleToolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Switch the tool type, reset description/options
    onChange(toolKey, {
      tool: e.target.value,
      description: '',
      options: {},
    });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(toolKey, {
      ...configuration,
      description: e.target.value,
    });
  };

  const handleOptionsChange = (updatedOptions: Record<string, any>) => {
    onChange(toolKey, {
      ...configuration,
      options: updatedOptions,
    });
  };

  return (
    <>
      {/* Choose Tool */}
      <div className="mb-3">
        <label className="block text-sm font-medium">{t('Tool Type')}</label>
        <select
          className="border p-2 rounded w-full text-sm"
          value={configuration.tool}
          onChange={handleToolChange}
        >
          {registryKeys.map((toolName) => (
            <option key={toolName} value={toolName}>
              {toolConfiguratorDescriptor.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Description (common to all tools) */}
      <div className="mb-3">
        <label className="block text-sm font-medium">{t('Description')}</label>
        <input
          className="border p-2 rounded w-full text-sm"
          type="text"
          value={configuration.description}
          onChange={handleDescriptionChange}
        />
      </div>

      {/* Tool-specific Configurator */}
      <Configurator
        options={configuration.options}
        onChange={handleOptionsChange}
      />
    </>
  );
}
