import React, { use, useEffect } from 'react';
// If you are using zod:
// If you are using the 'tool' helper from @vercel/ai, import it:
import { useTranslation } from 'react-i18next';

export const defaultFromValue = process.env.NEXT_PUBLIC_EMAIL_FROM || '';

type SendEmailOptions = {
  to: string;
  from: string;
  subject: string;
  body: string;
};

type SendEmailConfiguratorProps = {
  options: SendEmailOptions;
  onChange: (updated: SendEmailOptions) => void;
};

// The form UI for configuring the "sendEmail" tool:
export function SendEmailConfigurator({ options, onChange }: SendEmailConfiguratorProps) {
  const { t } = useTranslation();
  useEffect(() => {
    if (defaultFromValue !== '') {
      onChange({ ...options, from: defaultFromValue });
    }
  }, []);
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...options, to: e.target.value });
  };
  const handleFromEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...options, from: e.target.value });
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{t('Recipient Email')}</label>
      <input
        className="border p-2 rounded w-full text-sm"
        type="email"
        value={options.to}
        onChange={handleEmailChange}
      />
      {defaultFromValue === '' ? (
        <>
          <label className="block text-sm font-medium">{t('From Email')}</label>
          <input readOnly={defaultFromValue !== '' ? true : false}
            className="border p-2 rounded w-full text-sm"
            type="email"
            value={defaultFromValue ? defaultFromValue : options.from}
            onChange={handleFromEmailChange}
          />
        </>
      ) : null}

    </div>
  );
}
