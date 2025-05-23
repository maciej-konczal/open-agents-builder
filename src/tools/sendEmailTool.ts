// If you are using zod:
import { z } from 'zod';
// If you are using the 'tool' helper from @vercel/ai, import it:
import { tool } from 'ai'; // Adjust the import based on your actual setup.
import { ToolDescriptor } from './registry';
import axios from 'axios';

/**
 * Configuration options for creating the Email Tool.
 */
interface EmailToolOptions {
  /**
   * Your Resend.com API key.
   * (Required)
   */
  apiKey: string

  /**
   * Optional override of the default Resend API endpoint.
   * @default 'https://api.resend.com/emails'
   */
  url?: string
}

/**
 * Default values for the Email Tool options.
 */
const defaults = {
  url: 'https://api.resend.com/emails',
}

/**
 * Factory function to create a "sendEmail" tool for sending messages via Resend.
 */
export const createEmailTool = (options: EmailToolOptions):ToolDescriptor => {
  const config = {
    ...defaults,
    ...options,
  } satisfies Required<EmailToolOptions>

  // Setup any default headers (authorization, etc.)
  const requestConfig = {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
  }
  
  return {
    tool: tool({
      description: 'Sends an email using the Resend.com API. Provide "from", "to", "subject", etc.',
      parameters: z.object({
        from: z.string().describe('The "From" address, e.g. "Acme <onboarding@resend.dev>".'),
        to: z
          .array(z.string())
          .describe('The list of recipient email addresses, e.g. ["user@example.com"].'),
        subject: z.string().describe('The subject of the email.'),
        text: z.string().describe('Plaintext body content of the email.'),
        html: z.string().describe('HTML body content of the email.'),
      }),
      execute: async ({ from, to, subject, text, html }) => {
        try {
          const response = await axios.post(
            config.url,
            {
              from,
              to,
              subject,
              text,
              html,
            },
            requestConfig
          )
          return typeof response.data === 'object'
            ? JSON.stringify(response.data)
            : (response.data as string)
        } catch (error) {
          if (axios.isAxiosError(error)) {
            console.error(`HTTP error ${error.response?.status}: ${JSON.stringify(error.response?.data) || error.message}`);
          } else {
            console.error(`Unknown error: ${error}`)
          }
          return 'Error sending email!';
        }
      },
    }),
    displayName: 'Send Email'
  }
};
