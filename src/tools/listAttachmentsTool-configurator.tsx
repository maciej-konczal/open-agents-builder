'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

type ListAttachmentsOptions = {
  mimeTypes: string;
};


type ListAttachmentsConfiguratorProps = {
  // This tool needs no special options, but we keep the shape for consistency:
  options: ListAttachmentsOptions;
  onChange: (updated: ListAttachmentsOptions) => void;
};


export function ListAttachmentsConfigurator({ options, onChange }: ListAttachmentsConfiguratorProps) {
  const { t } = useTranslation();
  const [mimeTypes, setMimeTypes] = React.useState(options.mimeTypes);
  // No config needed, but here's a placeholder:

  const handleMimeTypesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...options, mimeTypes: e.target.value });
    setMimeTypes(e.target.value);
  };

  return (
    <div className="space-y-2">
      <div>
        <label htmlFor="mimeTypes" className="block text-sm font-medium">{t('Mime types available for agents: (eg. text/markdown, application/zip ...)')}</label>
      </div>
      <div>
      <input
        id="mimeTypes"
        className="border p-2 rounded text-sm mr-2 w-full text-xs"
        type="text"
        value={mimeTypes}
        onChange={handleMimeTypesChange}
      />
      </div>

    </div>
  );
}
