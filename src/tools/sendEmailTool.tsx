'use client';

import React from 'react';
// If you are using zod:
import { z } from 'zod';
// If you are using the 'tool' helper from @vercel/ai, import it:
import { tool } from 'ai'; // Adjust the import based on your actual setup.
import { useTranslation } from 'react-i18next';
import { ToolDescriptor } from '.';

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

// The actual "tool" executor, matching the Vercel AI shape:
export const sendEmailTool: ToolDescriptor = {
  configurator: SendEmailConfigurator,
  displayName: 'Send Email',
  tool: tool({
    type: 'function',
    description: 'Send an email to the provided address.',
    // zod ensures "email" is required:
    parameters: z.object({
      email: z.string().email().describe('The email address to send to'),
      subject: z.string().describe('The subject of the email'),
      body: z.string().describe('The body of the email'),
    }),
    // Called by the LLM or your own code to actually execute the tool:
    execute: async ({ email, subject, body }: { email: string; subject: string; body: string; }) => {
      // Pseudocode for sending email:
      console.log('Sending email to', email);
      // Return a string for the LLM or handle logic as needed
      return `Email to ${email} has been sent successfully.`;
    },
  }),
};
