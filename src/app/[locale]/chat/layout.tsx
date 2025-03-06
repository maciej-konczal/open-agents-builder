'use client'

import initTranslations from '@/app/i18n';
import TranslationProvider from '@/app/translation-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { ExecProvider } from '@/contexts/exec-context';

const i18nNamespaces = ['translation'];

// eslint-disable-next-line @next/next/no-async-client-component
export default async function GeneraChatlLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string, locale: string };
}) {
  const { resources } =  await initTranslations(params.locale, i18nNamespaces);

  return (
    <TranslationProvider locale={params.locale} resources={resources} namespaces={i18nNamespaces}>
      <ExecProvider>
      <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </ExecProvider>
    </TranslationProvider>
  );
}