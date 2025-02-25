'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { tool } from 'ai';

type ListProductsConfiguratorProps = {
  // This tool needs no special options, but we keep the shape for consistency:
  options: Record<string, never>;
  onChange: (updated: Record<string, never>) => void;
};

export function ListProductsConfigurator({ options, onChange }: ListProductsConfiguratorProps) {
  const { t } = useTranslation();
  // No config needed, but here's a placeholder:
  return <p className="text-sm text-gray-600">{t('No configuration required for listProducts tool.')}</p>;
}

