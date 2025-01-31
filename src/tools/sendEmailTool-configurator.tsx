import React from 'react';
// If you are using zod:
// If you are using the 'tool' helper from @vercel/ai, import it:
import { useTranslation } from 'react-i18next';

type SendEmailOptions = {
  email: string;
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
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...options, email: e.target.value });
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{t('Recipient Email')}</label>
      <input
        className="border p-2 rounded w-full text-sm"
        type="email"
        value={options.email}
        onChange={handleEmailChange}
      />
    </div>
  );
}
