'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

type CalendarListOptions = {
  virtualProducts: boolean;
};


type CreateOrderToolConfiguratorProps = {
  // This tool needs no special options, but we keep the shape for consistency:
  options: CalendarListOptions;
  onChange: (updated: CalendarListOptions) => void;
};


export function CreateOrderToolConfigurator({ options, onChange }: CreateOrderToolConfiguratorProps) {
  const { t } = useTranslation();
  const [virtualProducts, setVirtualProducts] = React.useState(options.virtualProducts);
  // No config needed, but here's a placeholder:

  const handlevirtualProductsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...options, virtualProducts: !!e.target.checked });
    setVirtualProducts(!!e.target.checked);
  };

  return (
    <div className="space-y-2 flex">
      <input
        id="virtualproducts"
        className="border p-2 rounded text-sm mr-2"
        type="checkbox"
        checked={virtualProducts}
        value={"true"}
        onChange={handlevirtualProductsChange}
      />
      <label htmlFor="virtualproducts" className="block text-sm font-medium">{t('Allow customers to order virtual products or services (that does not exist in the catalog) and let AI to set the prices (')}<strong>{t('potentially dangerous')}</strong>{t('Useful for custom services or made-for-order products)')}</label>
    </div>
  );
}

