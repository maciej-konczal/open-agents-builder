'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

type CalendarListOptions = {
  limitedVisibility: boolean;
};


type CalendarListConfiguratorProps = {
  // This tool needs no special options, but we keep the shape for consistency:
  options: CalendarListOptions;
  onChange: (updated: CalendarListOptions) => void;
};


export function CalendarListConfigurator({ options, onChange }: CalendarListConfiguratorProps) {
  const { t } = useTranslation();
  const [limitedVisibility, setLimitedVisibility] = React.useState(options.limitedVisibility);
  // No config needed, but here's a placeholder:

  const handleLimitedVisibilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...options, limitedVisibility: !!e.target.checked });
    setLimitedVisibility(!!e.target.checked);
  };

  return (
    <div className="space-y-2 flex">
      <input
        id="limitedVisibility"
        className="border p-2 rounded text-sm mr-2"
        type="checkbox"
        checked={limitedVisibility}
        value={"true"}
        onChange={handleLimitedVisibilityChange}
      />
      <label htmlFor="limitedVisibility" className="block text-sm font-medium">{t('Limited calendar visibility - expose only calendar availability; no event names, participents etc.')}</label>
    </div>
  );
}

